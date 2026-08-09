import crypto from "crypto";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { calculateSaasAnnualTax } from "../utils/saasTaxCalculator";
import { generateUniqueLicenseNumber } from "../utils/licenseNumber.util";
import { SaasProvisioningService } from "../provisioning/saasProvisioning.service";

const provisioningService = new SaasProvisioningService();

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

    // Create a gateway order ID
    const gatewayOrderId = `order_sag_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

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
        paymentMethod: "UPI",
        notes: input.notes || "Annual ShabooAgri Subscription Order",
      },
    });

    const isProduction = !!process.env.RAZORPAY_KEY_ID;

    return {
      paymentId: payment.id,
      gatewayOrderId,
      amount: tax.totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_shabooagri_sandbox",
      taxBreakdown: {
        baseAmount: tax.baseAmount,
        gstAmount: tax.gstAmount,
        totalAmount: tax.totalAmount,
        cgstAmount: tax.cgstAmount,
        sgstAmount: tax.sgstAmount,
        igstAmount: tax.igstAmount,
      },
      environment: isProduction ? "PRODUCTION" : "SANDBOX_TEST",
    };
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

    const gatewayPaymentId = input.gatewayPaymentId || `pay_sag_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const gatewaySignature = input.gatewaySignature || `sig_sag_${crypto.randomBytes(16).toString("hex")}`;

    // Execute atomic payment verification, license activation & tenant provisioning
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.saaSPayment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          gatewayPaymentId,
          gatewaySignature,
          paymentReference: gatewayPaymentId,
        },
      });

      // Find or create customer license
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
            gatewayPaymentId,
            totalAmount: Number(payment.totalAmount),
            licenseNumber: license.licenseNumber,
          },
        },
      });

      return { payment: updatedPayment, license };
    });

    // Provision operational tenant idempotently
    const provisionRes = await provisioningService.provisionTenantForSaasUser(saasUserId);

    return {
      success: true,
      status: "SUCCESS",
      paymentId: result.payment.id,
      licenseNumber: result.license.licenseNumber,
      tenantSlug: provisionRes.tenantSlug,
      softwareUrl: provisionRes.softwareUrl,
      alreadyProcessed: false,
    };
  }

  async handleWebhook(payload: any) {
    const gatewayOrderId = payload?.orderId || payload?.gatewayOrderId || payload?.payment?.gatewayOrderId;
    if (!gatewayOrderId) {
      throw new AppError(400, "Missing gateway order ID in webhook payload");
    }

    const payment = await prisma.saaSPayment.findFirst({
      where: { gatewayOrderId },
    });

    if (!payment) {
      throw new AppError(404, "Target payment order not found for webhook");
    }

    if (payment.status === "SUCCESS") {
      return { status: "ALREADY_PROCESSED", paymentId: payment.id };
    }

    return this.verifyPayment(payment.saasUserId, {
      paymentId: payment.id,
      gatewayPaymentId: payload?.paymentId || payload?.gatewayPaymentId,
      gatewaySignature: payload?.signature,
    });
  }
}
