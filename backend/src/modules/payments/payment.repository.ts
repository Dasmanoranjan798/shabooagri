import type { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { invoiceIncludeRelations } from "./invoice.repository";

export const paymentIncludeRelations = {
  invoice: {
    include: {
      customer: true,
    },
  },
  receiver: {
    select: {
      id: true,
      fullName: true,
      email: true,
      mobileNumber: true,
    },
  },
} satisfies Prisma.PaymentInclude;

export interface PaymentListFilter {
  invoiceId?: string;
  customerId?: string;
}

export function findAllForCompany(companyId: string, filter: PaymentListFilter = {}) {
  const where: Prisma.PaymentWhereInput = { companyId };
  if (filter.invoiceId) {
    where.invoiceId = filter.invoiceId;
  }
  if (filter.customerId) {
    where.invoice = { customerId: filter.customerId };
  }

  return prisma.payment.findMany({
    where,
    include: paymentIncludeRelations,
    orderBy: { createdAt: "desc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.payment.findFirst({
    where: { id, companyId },
    include: paymentIncludeRelations,
  });
}

export function findAllForInvoice(companyId: string, invoiceId: string) {
  return prisma.payment.findMany({
    where: { companyId, invoiceId },
    include: paymentIncludeRelations,
    orderBy: { createdAt: "asc" },
  });
}

// Dependency-guard support (§ dependency-locked deletion) — how many
// non-voided payments a given invoice still has. Used to block Job
// cancellation while real, unvoided money is still linked to it.
export function countNonVoidedByInvoiceId(companyId: string, invoiceId: string) {
  return prisma.payment.count({ where: { companyId, invoiceId, voided: false } });
}

// Void, not delete — a Payment stays permanently in history/reports with
// voided=true instead of being removed. Independent of the parent
// invoice's own void state (see Payment.voided doc comment in
// schema.prisma). Mirrors recordPaymentTx's locked-read-then-recompute
// shape: reversing a payment must adjust the invoice's paidAmount/
// balanceAmount/status the same way applying one does, just subtracting
// instead of adding — skipped entirely if the invoice itself is already
// VOIDED, since a voided invoice's own numbers are frozen history, not
// something a payment void should reopen.
export async function voidPaymentTx(companyId: string, paymentId: string, reason: string, voidedBy: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId } });
    if (!payment) {
      throw new AppError(404, "Payment not found");
    }
    if (payment.voided) {
      throw new AppError(400, "This payment has already been voided");
    }

    const locked = await tx.$queryRaw<
      Array<{ id: string; total_amount: string; paid_amount: string; status: InvoiceStatus }>
    >`
      SELECT id, total_amount::text, paid_amount::text, status
      FROM invoices
      WHERE id = ${payment.invoiceId}::uuid AND company_id = ${companyId}::uuid
      FOR UPDATE
    `;
    const invoiceRow = locked[0];

    if (invoiceRow && invoiceRow.status !== "VOIDED") {
      const totalAmount = Number(invoiceRow.total_amount);
      const newPaidAmount = Math.max(0, Math.round((Number(invoiceRow.paid_amount) - Number(payment.amount)) * 100) / 100);
      const newBalanceAmount = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);
      const newStatus: InvoiceStatus = newPaidAmount <= 0 ? "UNPAID" : newBalanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { paidAmount: newPaidAmount, balanceAmount: newBalanceAmount, status: newStatus },
      });
    }

    return tx.payment.update({
      where: { id: paymentId },
      data: { voided: true, voidReason: reason, voidedAt: new Date(), voidedBy },
      include: paymentIncludeRelations,
    });
  });
}

export interface RecordPaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  receivedBy: string;
  notes?: string;
}

// Transactional write: locks the invoice row (SELECT ... FOR UPDATE), then
// validates and recomputes paidAmount/balanceAmount/status from that locked
// read — not from a value the caller read before the transaction started.
// Two concurrent payments against the same invoice can no longer both read
// the same stale balance and both pass validation; the second one blocks on
// the row lock until the first commits, then re-validates against the
// now-updated balance and is correctly rejected if it would overpay.
export async function recordPaymentTx(companyId: string, invoiceId: string, paymentData: RecordPaymentData) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ id: string; total_amount: string; paid_amount: string; balance_amount: string; status: InvoiceStatus }>
    >`
      SELECT id, total_amount::text, paid_amount::text, balance_amount::text, status
      FROM invoices
      WHERE id = ${invoiceId}::uuid AND company_id = ${companyId}::uuid
      FOR UPDATE
    `;
    const invoiceRow = locked[0];
    if (!invoiceRow) {
      throw new AppError(404, "Invoice not found");
    }
    if (invoiceRow.status === "PAID") {
      throw new AppError(400, "Invoice is already fully paid");
    }

    const balanceAmount = Number(invoiceRow.balance_amount);
    if (balanceAmount <= 0) {
      throw new AppError(400, "Invoice balance is zero");
    }
    if (paymentData.amount > balanceAmount) {
      throw new AppError(400, `Payment amount (${paymentData.amount}) exceeds remaining balance (${balanceAmount})`);
    }

    const currentPaid = Number(invoiceRow.paid_amount);
    const totalAmount = Number(invoiceRow.total_amount);
    const newPaidAmount = Math.round((currentPaid + paymentData.amount) * 100) / 100;
    const newBalanceAmount = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);
    const newStatus: InvoiceStatus = newBalanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    const payment = await tx.payment.create({
      data: {
        companyId,
        invoiceId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        receivedBy: paymentData.receivedBy,
        notes: paymentData.notes,
      },
      include: paymentIncludeRelations,
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
      },
      include: invoiceIncludeRelations,
    });

    return { payment, invoice: updatedInvoice };
  });
}

// ---- Dashboard aggregation helpers (no business logic — raw DB queries) ----
// All aggregations are pushed to PostgreSQL. receivedAt is stored as UTC;
// callers pass UTC window boundaries derived from the company timezone.

// Total payment amount received within a UTC window. Excludes voided
// payments — a voided payment is kept in history/reports as "Voided" but
// must not keep counting toward revenue once it's been reversed.
export async function sumReceivedInWindow(companyId: string, fromUtc: Date, toUtc: Date): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: { companyId, voided: false, receivedAt: { gte: fromUtc, lt: toUtc } },
    _sum: { amount: true },
  });
  return result._sum.amount != null ? Number(result._sum.amount) : 0;
}

// Total outstanding balance across all invoices that are not fully paid.
// This is "Pending Collection" — money invoiced but not yet received.
export async function sumPendingBalance(companyId: string): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: { companyId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    _sum: { balanceAmount: true },
  });
  return result._sum.balanceAmount != null ? Number(result._sum.balanceAmount) : 0;
}

// Previous-period pending balance: used for delta comparison. Returns the
// sum of invoices created strictly before a given cutoff that still have
// an outstanding balance — approximates what the pending balance looked
// like at that earlier point in time.
export async function sumPendingBalanceCreatedBefore(companyId: string, before: Date): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: { in: ["UNPAID", "PARTIALLY_PAID"] },
      createdAt: { lt: before },
    },
    _sum: { balanceAmount: true },
  });
  return result._sum.balanceAmount != null ? Number(result._sum.balanceAmount) : 0;
}

// Daily payment totals within a window for the income-overview chart.
// Uses a raw query because Prisma groupBy cannot group by a date-only
// expression from a DateTime column (it groups on the full timestamp).
export async function getReceivedByDay(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<Array<{ date: string; amount: number }>> {
  const rows = await prisma.$queryRaw<Array<{ day: Date; total: string }>>`
    SELECT
      date_trunc('day', received_at)::date AS day,
      SUM(amount)::text                    AS total
    FROM payments
    WHERE company_id = ${companyId}::uuid
      AND voided = false
      AND received_at >= ${fromUtc}
      AND received_at <  ${toUtc}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10), // YYYY-MM-DD
    amount: Number(r.total),
  }));
}

// Monthly payment totals within a window for the income-overview chart
// when the "12 months" range is selected. Groups by year-month bucket.
export async function getReceivedByMonth(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<Array<{ month: string; amount: number }>> {
  const rows = await prisma.$queryRaw<Array<{ month: Date; total: string }>>`
    SELECT
      date_trunc('month', received_at)::date AS month,
      SUM(amount)::text                      AS total
    FROM payments
    WHERE company_id = ${companyId}::uuid
      AND voided = false
      AND received_at >= ${fromUtc}
      AND received_at <  ${toUtc}
    GROUP BY month
    ORDER BY month ASC
  `;
  return rows.map((r) => ({
    month: r.month.toISOString().slice(0, 7), // YYYY-MM
    amount: Number(r.total),
  }));
}

// Pending invoices list for Dashboard pending-payments widget. Returns
// invoice rows with customer and village, scoped to company.
export function findPendingInvoices(companyId: string) {
  return prisma.invoice.findMany({
    where: { companyId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      invoiceDate: true,
      dueDate: true,
      customer: {
        select: {
          id: true,
          name: true,
          village: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });
}
