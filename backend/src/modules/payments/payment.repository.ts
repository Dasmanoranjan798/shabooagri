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
// non-cancelled payments a given invoice still has. Used to block Job
// cancellation while real, un-cancelled money is still linked to it.
export function countNonCancelledByInvoiceId(companyId: string, invoiceId: string) {
  return prisma.payment.count({ where: { companyId, invoiceId, cancelled: false } });
}

// Cancel, not delete — a Payment stays permanently in history/reports with
// cancelled=true instead of being removed. Independent of the parent
// invoice's own cancel state (see Payment.cancelled doc comment in
// schema.prisma). Mirrors recordPaymentTx's locked-read-then-recompute
// shape: reversing a payment must adjust the invoice's paidAmount/
// balanceAmount/status the same way applying one does, just subtracting
// instead of adding — skipped entirely if the invoice itself is already
// CANCELLED, since a cancelled invoice's own numbers are frozen history, not
// something a payment cancel should reopen.
export async function cancelPaymentTx(companyId: string, paymentId: string, reason: string, cancelledBy: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId } });
    if (!payment) {
      throw new AppError(404, "Payment not found");
    }
    if (payment.cancelled) {
      throw new AppError(400, "This payment has already been cancelled");
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

    if (invoiceRow && invoiceRow.status !== "CANCELLED") {
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
      data: { cancelled: true, cancelReason: reason, cancelledAt: new Date(), cancelledBy },
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

// A payment applied to an invoice other than the one the money was received
// against — the overflow of an overpayment settling the customer's other
// open invoices, oldest first.
export interface OverflowApplication {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Transactional write: locks the invoice row (SELECT ... FOR UPDATE), then
// validates and recomputes paidAmount/balanceAmount/status from that locked
// read — not from a value the caller read before the transaction started.
// Two concurrent payments against the same invoice can no longer both read
// the same stale balance and both pass validation; the second one blocks on
// the row lock until the first commits, then re-validates against the
// now-updated balance.
//
// Overpayment is intentionally allowed (a customer handing over more than a
// single invoice's balance is normal): the money settles this invoice up to
// its balance, any remainder is auto-applied to the customer's OTHER open
// invoices oldest-first (each its own Payment row, mirroring a manual
// payment), and whatever is still left over after every open invoice is
// settled becomes the customer's advance/credit balance — a `customer_advances`
// row with appliedAmount=0. There is no standalone "advance" entry: this is
// the single authoritative place a customer credit balance is ever created.
export async function recordPaymentTx(companyId: string, invoiceId: string, paymentData: RecordPaymentData) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{
        id: string;
        invoice_number: string;
        customer_id: string;
        total_amount: string;
        paid_amount: string;
        balance_amount: string;
        status: InvoiceStatus;
      }>
    >`
      SELECT id, invoice_number, customer_id::text AS customer_id,
             total_amount::text, paid_amount::text, balance_amount::text, status
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

    const customerId = invoiceRow.customer_id;
    const totalReceived = round2(paymentData.amount);

    // 1. Settle THIS invoice, capped at its balance.
    const appliedToTarget = round2(Math.min(totalReceived, balanceAmount));
    const currentPaid = Number(invoiceRow.paid_amount);
    const totalAmount = Number(invoiceRow.total_amount);
    const newPaidAmount = round2(currentPaid + appliedToTarget);
    const newBalanceAmount = Math.max(0, round2(totalAmount - newPaidAmount));
    const newStatus: InvoiceStatus = newBalanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    const payment = await tx.payment.create({
      data: {
        companyId,
        invoiceId,
        amount: appliedToTarget,
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

    let remaining = round2(totalReceived - appliedToTarget);
    const overflowApplications: OverflowApplication[] = [];

    // 2. Spill the remainder onto the customer's other open invoices,
    //    oldest first. The just-settled target is either now PAID (so it
    //    won't appear) or was only partially paid — but partial payment
    //    means remaining is already 0, so it can never be double-applied.
    if (remaining > 0) {
      const others = await tx.$queryRaw<
        Array<{ id: string; invoice_number: string; total_amount: string; paid_amount: string; balance_amount: string }>
      >`
        SELECT id, invoice_number, total_amount::text, paid_amount::text, balance_amount::text
        FROM invoices
        WHERE company_id = ${companyId}::uuid
          AND customer_id = ${customerId}::uuid
          AND id <> ${invoiceId}::uuid
          AND status IN ('UNPAID', 'PARTIALLY_PAID')
        ORDER BY invoice_date ASC
        FOR UPDATE
      `;

      for (const other of others) {
        if (remaining <= 0) break;
        const otherBalance = Number(other.balance_amount);
        if (otherBalance <= 0) continue;

        const applyAmount = round2(Math.min(remaining, otherBalance));
        const otherPaid = round2(Number(other.paid_amount) + applyAmount);
        const otherTotal = Number(other.total_amount);
        const otherNewBalance = Math.max(0, round2(otherTotal - otherPaid));
        const otherStatus: InvoiceStatus = otherNewBalance === 0 ? "PAID" : "PARTIALLY_PAID";

        await tx.payment.create({
          data: {
            companyId,
            invoiceId: other.id,
            amount: applyAmount,
            paymentMethod: paymentData.paymentMethod,
            referenceNumber: paymentData.referenceNumber,
            receivedBy: paymentData.receivedBy,
            notes: `Applied from overpayment on ${invoiceRow.invoice_number}`,
          },
        });
        await tx.invoice.update({
          where: { id: other.id },
          data: { paidAmount: otherPaid, balanceAmount: otherNewBalance, status: otherStatus },
        });

        overflowApplications.push({ invoiceId: other.id, invoiceNumber: other.invoice_number, amount: applyAmount });
        remaining = round2(remaining - applyAmount);
      }
    }

    // 3. Anything still left over is a real advance/credit balance.
    let creditCreated = 0;
    if (remaining > 0) {
      await tx.customerAdvance.create({
        data: {
          companyId,
          customerId,
          amount: remaining,
          appliedAmount: 0,
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: paymentData.referenceNumber,
          receivedBy: paymentData.receivedBy,
          notes: `Credit from overpayment on ${invoiceRow.invoice_number}`,
        },
      });
      creditCreated = remaining;
    }

    return { payment, invoice: updatedInvoice, overflowApplications, creditCreated };
  });
}

// ---- Dashboard aggregation helpers (no business logic — raw DB queries) ----
// All aggregations are pushed to PostgreSQL. receivedAt is stored as UTC;
// callers pass UTC window boundaries derived from the company timezone.

// Total payment amount received within a UTC window. Excludes cancelled
// payments — a cancelled payment is kept in history/reports as "Cancelled" but
// must not keep counting toward revenue once it's been reversed.
export async function sumReceivedInWindow(companyId: string, fromUtc: Date, toUtc: Date): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: { companyId, cancelled: false, receivedAt: { gte: fromUtc, lt: toUtc } },
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
      AND cancelled = false
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
      AND cancelled = false
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
          village: true,
        },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });
}
