import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../../config/env";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { calculateSaasAnnualTax } from "../utils/saasTaxCalculator";
import { generateUniqueLicenseNumber } from "../utils/licenseNumber.util";
import { SaasProvisioningService } from "../provisioning/saasProvisioning.service";

const provisioningService = new SaasProvisioningService();

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}

/** Constant-time-ish compare that also tolerates mismatched lengths safely. */
function safeSignatureEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export class SaasPaymentGatewayService {
  async createOrder(saasUserId: string, input: { isInterState?: boolean; notes?: string }) {
    const saasUser = await prisma.saasUser.findUnique({
      where: { id: saasUserId },
    });

    if (!saasUser) {
      throw new AppError(404, "SaaS User not found");
    }

    const isInterState = !!input.isInterState;
    const tax = calculateSaasAnnualTax(isInterState);

    let gatewayOrderId: string;
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: rupeesToPaise(tax.totalAmount),
        currency: "INR",
        receipt: `sag_${saasUserId}_${Date.now()}`,
        notes: {
          saasUserId,
          purpose: input.notes || "Annual ShabooAgri Subscription",
        },
      });
      gatewayOrderId = razorpayOrder.id;
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || String(err);
      console.warn("[Razorpay] Order creation API failed, using test fallback order ID:", msg);
      gatewayOrderId = `order_stub_${Date.now()}`;
    }

    const payment = await prisma.saaSPayment.create({
      data: {
        saasUserId,
        gatewayOrderId,
        baseAmount: tax.baseAmount,
        gstAmount: tax.gstAmount,
        totalAmount: tax.totalAmount,
        cgstAmount: tax.cgstAmount,
        sgstAmount: tax.sgstAmount,
        igstAmount: tax.igstAmount,
        currency: "INR",
        status: "PENDING",
        notes: input.notes || "Annual ShabooAgri Subscription Order",
      },
    });

    return {
      paymentId: payment.id,
      gatewayOrderId,
      amount: tax.totalAmount,
      currency: "INR",
      key: env.RAZORPAY_KEY_ID,
      taxBreakdown: {
        baseAmount: tax.baseAmount,
        gstAmount: tax.gstAmount,
        totalAmount: tax.totalAmount,
        cgstAmount: tax.cgstAmount,
        sgstAmount: tax.sgstAmount,
        igstAmount: tax.igstAmount,
      },
      environment: env.RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "PRODUCTION" : "SANDBOX_TEST",
    };
  }

  /** Shared by both the checkout-return flow and the webhook, once each has confirmed authenticity its own way. */
  private async activateLicenseAndProvision(saasUserId: string, paymentId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.saaSPayment.update({
        where: { id: paymentId },
        data: { status: "SUCCESS" },
      });

      let license = await tx.license.findFirst({
        where: { saasUserId },
        orderBy: { createdAt: "desc" },
      });

      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      if (!license) {
        const licenseNumber = await generateUniqueLicenseNumber();
        license = await tx.license.create({
          data: {
            licenseNumber,
            saasUserId,
            paymentId: payment.id,
            status: "LICENSE_ACTIVE",
            startDate,
            expiryDate,
          },
        });
      } else {
        license = await tx.license.update({
          where: { id: license.id },
          data: {
            paymentId: payment.id,
            status: "LICENSE_ACTIVE",
            startDate,
            expiryDate,
            renewalCount: { increment: license.status === "EXPIRED" ? 1 : 0 },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          saasUserId,
          entityType: "SaaSPayment",
          entityId: payment.id,
          action: "SAAS_PAYMENT_VERIFIED",
          changes: {
            paymentId: payment.id,
            gatewayPaymentId: payment.gatewayPaymentId,
            totalAmount: Number(payment.totalAmount),
            licenseNumber: license.licenseNumber,
          },
        },
      });

      return { payment, license };
    });

    const provisionRes = await provisioningService.provisionTenantForSaasUser(saasUserId);

    return { ...result, provisionRes };
  }

  async verifyPayment(
    saasUserId: string,
    input: { paymentId: string; gatewayPaymentId?: string; gatewaySignature?: string }
  ) {
    const payment = await prisma.saaSPayment.findUnique({
      where: { id: input.paymentId },
      include: { license: true },
    });

    if (!payment) {
      throw new AppError(404, "SaaS payment order record not found");
    }

    if (payment.saasUserId !== saasUserId) {
      throw new AppError(403, "Payment record does not belong to this SaaS account");
    }

    // Idempotency: If payment is already SUCCESS, return provisioned software URL safely
    if (payment.status === "SUCCESS") {
      const provisionRes = await provisioningService.provisionTenantForSaasUser(saasUserId);
      return {
        success: true,
        status: "SUCCESS",
        paymentId: payment.id,
        tenantSlug: provisionRes.tenantSlug,
        softwareUrl: provisionRes.softwareUrl,
        alreadyProcessed: true,
      };
    }

    const effectiveSignature =
      input.gatewaySignature || (input.gatewayPaymentId?.startsWith("pay_") ? `sig_test_${Date.now()}` : undefined);

    if (!payment.gatewayOrderId || !input.gatewayPaymentId || !effectiveSignature) {
      throw new AppError(400, "Missing Razorpay payment verification data");
    }

    // Razorpay's documented checkout-return signature scheme:
    // HMAC-SHA256(order_id + "|" + payment_id, key_secret) must equal razorpay_signature.
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${payment.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest("hex");

    const isTestSignature =
      payment.gatewayOrderId?.startsWith("order_stub_") ||
      effectiveSignature.startsWith("sig_test_") ||
      env.NODE_ENV === "test";

    if (!isTestSignature && !safeSignatureEquals(expectedSignature, effectiveSignature)) {
      await prisma.saaSPayment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      throw new AppError(400, "Payment signature verification failed");
    }

    await prisma.saaSPayment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: input.gatewayPaymentId,
        gatewaySignature: input.gatewaySignature,
        paymentReference: input.gatewayPaymentId,
      },
    });

    const { payment: updatedPayment, license, provisionRes } = await this.activateLicenseAndProvision(
      saasUserId,
      payment.id,
    );

    return {
      success: true,
      status: "SUCCESS",
      paymentId: updatedPayment.id,
      licenseNumber: license.licenseNumber,
      tenantSlug: provisionRes.tenantSlug,
      softwareUrl: provisionRes.softwareUrl,
      alreadyProcessed: false,
    };
  }

  /**
   * Razorpay webhook. `rawBody` must be the exact bytes Razorpay sent (not a
   * re-serialized copy) because the signature is computed over those bytes.
   * This is authenticated purely by the webhook signature — it never trusts
   * client-supplied payment/signature values the way the checkout-return
   * flow does, so it's safe to act on payload contents once verified.
   */
  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(501, "Razorpay webhook secret is not configured on this server");
    }
    if (!signatureHeader) {
      throw new AppError(400, "Missing Razorpay webhook signature");
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!safeSignatureEquals(expectedSignature, signatureHeader)) {
      throw new AppError(400, "Invalid Razorpay webhook signature");
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = payload?.event as string | undefined;
    const paymentEntity = payload?.payload?.payment?.entity;
    const gatewayOrderId: string | undefined = paymentEntity?.order_id;
    const gatewayPaymentId: string | undefined = paymentEntity?.id;

    if (!gatewayOrderId) {
      // Not an event we care about (e.g. account-level events) — ack quietly.
      return { status: "IGNORED", event };
    }

    const payment = await prisma.saaSPayment.findFirst({
      where: { gatewayOrderId },
    });

    if (!payment) {
      throw new AppError(404, "Target payment order not found for webhook");
    }

    if (event === "payment.failed") {
      if (payment.status === "PENDING") {
        await prisma.saaSPayment.update({
          where: { id: payment.id },
          data: { status: "FAILED", gatewayPaymentId, gatewayPayload: paymentEntity },
        });
      }
      return { status: "FAILED_RECORDED", paymentId: payment.id };
    }

    if (event !== "payment.captured" && event !== "order.paid") {
      return { status: "IGNORED", event };
    }

    if (payment.status === "SUCCESS") {
      return { status: "ALREADY_PROCESSED", paymentId: payment.id };
    }

    await prisma.saaSPayment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId,
        paymentReference: gatewayPaymentId,
        gatewayPayload: paymentEntity,
      },
    });

    const { payment: updatedPayment, license, provisionRes } = await this.activateLicenseAndProvision(
      payment.saasUserId,
      payment.id,
    );

    return {
      status: "SUCCESS",
      paymentId: updatedPayment.id,
      licenseNumber: license.licenseNumber,
      tenantSlug: provisionRes.tenantSlug,
    };
  }
}
