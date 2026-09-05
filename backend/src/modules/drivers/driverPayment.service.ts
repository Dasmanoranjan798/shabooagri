import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { writeAudit } from "../../shared/audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import * as driverCompensationService from "./driverCompensation.service";
import type { DriverCompensationSummary } from "./driverCompensation.service";
import * as driverPaymentRepo from "./driverPayment.repository";

const round2 = (n: number) => Math.round(n * 100) / 100;
// Currency epsilon so float noise (e.g. 0.1+0.2) can't wrongly trip the
// "exceeds remaining" guard or hide a genuine tiny remainder.
const EPS = 0.005;

export type DriverPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface DriverPaymentView {
  id: string;
  driverId: string;
  amount: number;
  earnedSnapshot: number;
  paymentMethod: string;
  referenceNumber: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  notes: string | null;
  paidBy: string;
  paidByName: string | null;
  paidAt: string;
  cancelled: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
}

export interface DriverEarningsView {
  compensation: DriverCompensationSummary;
  totalEarned: number;
  totalPaid: number;
  remainingPayable: number;
  status: DriverPaymentStatus;
  payments: DriverPaymentView[];
}

function deriveStatus(earned: number, paid: number): DriverPaymentStatus {
  if (paid <= EPS) return "UNPAID";
  if (earned > 0 && paid >= earned - EPS) return "PAID";
  return "PARTIALLY_PAID";
}

// Owner/Manager may view any driver; a Driver may view only their own. 404
// (not 403) for a driver reaching for someone else's record so its existence
// isn't leaked — same rule as driver.service.getCompensationSummary.
async function assertCanView(companyId: string, driverId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  const ok = scope.kind === "company" || (scope.kind === "driver" && scope.driverId === driverId);
  if (!ok) throw new AppError(404, "Driver not found");
}

// Driver self-service: the literal id "me" resolves to the calling driver's
// own driverId (they don't know their internal id). Only a Driver-scoped
// caller can use "me".
export async function resolveDriverIdParam(companyId: string, user: AuthenticatedUser, idParam: string): Promise<string> {
  if (idParam !== "me") return idParam;
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "driver") return scope.driverId;
  throw new AppError(404, "Driver not found");
}

async function resolveNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

function toView(p: {
  id: string; driverId: string; amount: unknown; earnedSnapshot: unknown; paymentMethod: string;
  referenceNumber: string | null; periodFrom: Date | null; periodTo: Date | null; notes: string | null;
  paidBy: string; paidAt: Date; cancelled: boolean; cancelReason: string | null; cancelledAt: Date | null;
}, names: Map<string, string>): DriverPaymentView {
  return {
    id: p.id,
    driverId: p.driverId,
    amount: Number(p.amount),
    earnedSnapshot: Number(p.earnedSnapshot),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    periodFrom: p.periodFrom ? p.periodFrom.toISOString() : null,
    periodTo: p.periodTo ? p.periodTo.toISOString() : null,
    notes: p.notes,
    paidBy: p.paidBy,
    paidByName: names.get(p.paidBy) ?? null,
    paidAt: p.paidAt.toISOString(),
    cancelled: p.cancelled,
    cancelReason: p.cancelReason,
    cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
  };
}

// The full earnings-vs-payments picture for one driver. Earnings are derived
// live (never stored) by driverCompensation.service; paid is the sum of
// non-cancelled DriverPayment rows; remaining is the difference. Scope-checked.
export async function getDriverEarnings(
  companyId: string,
  driverId: string,
  user: AuthenticatedUser,
): Promise<DriverEarningsView> {
  await assertCanView(companyId, driverId, user);

  const compensation = await driverCompensationService.getDriverCompensationSummary(companyId, driverId);
  const rows = await driverPaymentRepo.findAllForDriver(companyId, driverId);
  const names = await resolveNames(rows.map((r) => r.paidBy));

  const totalEarned = round2(compensation.calculatedEarnings);
  const totalPaid = round2(rows.filter((r) => !r.cancelled).reduce((s, r) => s + Number(r.amount), 0));
  const remainingPayable = round2(totalEarned - totalPaid);

  return {
    compensation,
    totalEarned,
    totalPaid,
    remainingPayable,
    status: deriveStatus(totalEarned, totalPaid),
    payments: rows.map((r) => toView(r, names)),
  };
}

export async function listDriverPayments(companyId: string, driverId: string, user: AuthenticatedUser) {
  await assertCanView(companyId, driverId, user);
  const rows = await driverPaymentRepo.findAllForDriver(companyId, driverId);
  const names = await resolveNames(rows.map((r) => r.paidBy));
  return rows.map((r) => toView(r, names));
}

export interface RecordDriverPaymentInput {
  amount: number;
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CREDIT";
  referenceNumber?: string;
  periodFrom?: string;
  periodTo?: string;
  notes?: string;
}

// Records a Payment Out to a driver. Route-gated by driver_payment.pay
// (Owner/Manager). Enforces double-payment protection: the amount can never
// push total non-cancelled paid beyond the driver's live earned total.
export async function recordDriverPayment(
  companyId: string,
  user: AuthenticatedUser,
  driverId: string,
  input: RecordDriverPaymentInput,
) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId }, select: { id: true } });
  if (!driver) throw new AppError(404, "Driver not found");

  const compensation = await driverCompensationService.getDriverCompensationSummary(companyId, driverId);
  const totalEarned = round2(compensation.calculatedEarnings);
  const totalPaid = await driverPaymentRepo.sumNonCancelledForDriver(companyId, driverId);
  const remaining = round2(totalEarned - totalPaid);

  const amount = round2(input.amount);
  if (amount <= 0) throw new AppError(400, "Payment amount must be greater than zero");
  if (remaining <= EPS) {
    throw new AppError(400, `This driver has no remaining payable amount (earned ₹${totalEarned}, already paid ₹${totalPaid})`);
  }
  if (amount > remaining + EPS) {
    throw new AppError(400, `Payment (₹${amount}) exceeds remaining payable (₹${remaining}). Earned ₹${totalEarned}, already paid ₹${totalPaid}.`);
  }

  const created = await driverPaymentRepo.create(companyId, {
    driverId,
    amount,
    earnedSnapshot: totalEarned,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber,
    periodFrom: input.periodFrom ? new Date(input.periodFrom) : null,
    periodTo: input.periodTo ? new Date(input.periodTo) : null,
    notes: input.notes,
    paidBy: user.id,
  });

  await writeAudit({
    companyId,
    userId: user.id,
    entityType: "driver_payment",
    entityId: created.id,
    action: "driver_payment.created",
    changes: { driverId, amount, earnedSnapshot: totalEarned, totalPaidBefore: totalPaid, remainingBefore: remaining },
  });

  return getDriverEarnings(companyId, driverId, user);
}

// Cancel-not-delete: reverses a payment (stops counting toward paid) while
// keeping it in history. Route-gated by driver_payment.cancel (Owner only).
export async function cancelDriverPayment(
  companyId: string,
  paymentId: string,
  user: AuthenticatedUser,
  reason: string,
) {
  const existing = await driverPaymentRepo.findByIdScoped(companyId, paymentId);
  if (!existing) throw new AppError(404, "Driver payment not found");
  if (existing.cancelled) throw new AppError(400, "This payment has already been cancelled");

  await driverPaymentRepo.cancelPayment(companyId, paymentId, reason, user.id);

  await writeAudit({
    companyId,
    userId: user.id,
    entityType: "driver_payment",
    entityId: paymentId,
    action: "driver_payment.cancelled",
    changes: { driverId: existing.driverId, amount: Number(existing.amount), reason },
  });

  return getDriverEarnings(companyId, existing.driverId, user);
}
