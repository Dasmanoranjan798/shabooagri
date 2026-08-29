import crypto from "node:crypto";
import Razorpay from "razorpay";
import type { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import * as paymentRepository from "./payment.repository";
import { calculateTax } from "./taxCalculator";
import * as plansRepository from "../plans/plans.repository";
import * as provisioningService from "../provisioning/provisioning.service";
import { prisma } from "../../db/prisma";
import type { CreateOrderInput, VerifyPaymentInput } from "./payment.validators";

// Real Razorpay client only constructed when both keys are present — no
// hard requirement at boot (same lesson the operational backend already
// learned: a third-party billing dependency must never be able to prevent
// this service from starting). Without keys, createOrder falls back to a
// stub order id so the rest of the flow (payment record -> verify ->
// provision) is fully exercisable in dev/test without real Razorpay access.
const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;

// The stub payment path (no Razorpay keys -> synthetic order id, no
// signature to verify) exists ONLY so the signup -> pay -> provision
// pipeline is exercisable in dev/test before real keys exist. In
// production it must be structurally impossible: a paid license must never
// become ACTIVE without a genuine, signature-verified payment. If keys are
// missing in production we fail safe (reject) rather than activate for
// free. Enabling billing in production is therefore a matter of setting
// RAZORPAY_KEY_ID/SECRET — nothing here needs code changes to "go live".
const isProduction = env.NODE_ENV === "production";
const PAYMENTS_NOT_CONFIGURED_MESSAGE =
  "Online payments are not available right now. Please contact support to complete your purchase.";

function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}

function safeSignatureEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function createOrder(platformUserId: string, input: CreateOrderInput) {
  // Fail safe in production if the gateway isn't configured: never hand a
  // real user a stub order that would later "verify" for free.
  if (isProduction && !razorpay) {
    throw new AppError(503, PAYMENTS_NOT_CONFIGURED_MESSAGE);
  }

  const settings = await plansRepository.getSiteSettings();
  if (settings.purchasingBlocked) {
    throw new AppError(403, "Purchasing is temporarily unavailable. Please check back shortly.");
  }

  const plan = await plansRepository.findPlanByKey(input.planKey);
  if (!plan || !plan.isActive) {
    throw new AppError(400, "Unknown or unavailable pricing plan");
  }

  const machineLimit = plan.machineLimit + input.extraMachines;
  const totalPrice =
    Number(plan.priceAnnual) + input.extraMachines * Number(settings.extraMachinePrice);
  const tax = calculateTax(totalPrice, !!input.isInterState);

  let gatewayOrderId: string;
  if (razorpay) {
    try {
      const order = await razorpay.orders.create({
        amount: rupeesToPaise(tax.totalAmount),
        currency: "INR",
        receipt: `sag_${platformUserId}_${Date.now()}`,
        notes: { platformUserId, planKey: plan.key, extraMachines: input.extraMachines },
      });
      gatewayOrderId = order.id;
    } catch (err: any) {
      console.error("[Razorpay] Order creation failed:", err?.error?.description || err?.message || err);
      throw new AppError(502, "Payment gateway is currently unavailable. Please try again shortly.");
    }
  } else {
    // Stub mode: no Razorpay keys configured. Lets the whole payment ->
    // provisioning pipeline be tested end-to-end before real keys exist.
    gatewayOrderId = `order_stub_${Date.now()}`;
  }

  const user = await prisma.platformUser.findUnique({ where: { id: platformUserId } });
  const intent = user?.companySlug ? "upgrade" : "signup";

  const payment = await paymentRepository.createPayment({
    platformUserId,
    planKey: plan.key,
    intent,
    gatewayOrderId,
    amount: tax.totalAmount,
    currency: "INR",
    status: "PENDING",
    gatewayPayload: { tax, machineLimit, extraMachines: input.extraMachines } as unknown as Prisma.InputJsonValue,
  });

  return {
    paymentId: payment.id,
    gatewayOrderId,
    amount: tax.totalAmount,
    currency: "INR",
    key: env.RAZORPAY_KEY_ID || null,
    taxBreakdown: tax,
    plan: { key: plan.key, name: plan.name, machineLimit },
    intent,
    mode: razorpay ? "LIVE" : "STUB",
  };
}

export async function verifyPayment(platformUserId: string, input: VerifyPaymentInput) {
  const payment = await paymentRepository.findById(input.paymentId);
  if (!payment || payment.platformUserId !== platformUserId) {
    throw new AppError(404, "Payment not found");
  }
  if (payment.status === "SUCCESS") {
    throw new AppError(409, "Payment has already been verified");
  }

  if (razorpay) {
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
      .update(`${payment.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest("hex");
    if (!safeSignatureEquals(expectedSignature, input.gatewaySignature)) {
      throw new AppError(400, "Payment signature verification failed");
    }
  } else if (isProduction) {
    // No gateway configured AND we're in production: refuse. A license must
    // NEVER be activated without a signature-verified payment. This makes the
    // stub success path structurally unreachable in production, regardless of
    // how verifyPayment is called. Nothing below this point runs.
    throw new AppError(503, PAYMENTS_NOT_CONFIGURED_MESSAGE);
  }
  // Stub mode (non-production only): no real gateway to verify a signature
  // against — this path exists solely so the pipeline is testable before real
  // Razorpay keys are configured. It is disabled the instant
  // RAZORPAY_KEY_ID/SECRET are set, and can never run in production.

  await paymentRepository.updateStatus(payment.id, {
    status: "SUCCESS",
    gatewayPaymentId: input.gatewayPaymentId,
    gatewaySignature: input.gatewaySignature,
  });

  const machineLimit = (payment.gatewayPayload as any)?.machineLimit ?? 0;

  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  const existingLicense = await paymentRepository.findLatestLicenseForUser(platformUserId);
  const license = existingLicense
    ? await paymentRepository.updateLicense(existingLicense.id, {
        paymentId: payment.id,
        planKey: payment.planKey,
        status: "ACTIVE",
        startDate,
        expiryDate,
        renewalCount: { increment: existingLicense.status === "EXPIRED" ? 1 : 0 },
      })
    : await paymentRepository.createLicense({
        platformUserId,
        planKey: payment.planKey,
        paymentId: payment.id,
        status: "ACTIVE",
        startDate,
        expiryDate,
      });

  // Payment succeeded -> automatically provision (new company) or update
  // the plan (existing company). No manual approval step, per the
  // approved plan. Which path runs is decided by `intent`, set server-side
  // in createOrder from whether this platform user already has a company
  // — never trusted from client input.
  const provisionResult =
    payment.intent === "upgrade"
      ? await provisioningService.updatePlanForUser(platformUserId, { planKey: payment.planKey, machineLimit })
      : await provisioningService.provisionCompanyForUser(platformUserId, { planKey: payment.planKey, machineLimit });

  return { payment, license, provisioning: provisionResult };
}
