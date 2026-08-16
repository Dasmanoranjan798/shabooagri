import type { Booking, Job, Prisma, PricingMethod } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { calculateAmount, type PricingUnit } from "../../shared/pricing/pricing-calculator";
import * as customerService from "../customers/customer.service";
import * as invoiceRepository from "./invoice.repository";
import * as paymentRepository from "./payment.repository";
import * as customerAdvanceRepository from "./customerAdvance.repository";
import type {
  CreateManualInvoiceInput,
  ReceivePaymentInput,
  RecordCustomerAdvanceInput,
} from "./payment.validators";

type JobWithRelations = Job & {
  booking: Booking & {
    pricingMethod: PricingMethod;
  };
};

function resolveJobWorkedQuantity(
  unit: PricingUnit,
  actualHours: unknown,
  completedAcres: unknown,
): number | null {
  if (unit === "hour") return actualHours != null ? Number(actualHours) : 0;
  if (unit === "minute") return actualHours != null ? Number(actualHours) * 60 : 0;
  if (unit === "acre") return completedAcres != null ? Number(completedAcres) : 0;
  return null;
}

// §8.5 / §11.3: Called when a Job is completed. Uses the booking's rate and
// the Job's ACTUAL values (actualHours / completedAcres) matched to the
// booking's pricing_method.unit — not estimated values.
// Idempotent: if an invoice already exists for this booking, returns it.
export async function createInvoiceForCompletedJob(
  companyId: string,
  job: JobWithRelations,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const existing = await invoiceRepository.findByBookingIdScoped(companyId, job.bookingId, tx);
  if (existing) {
    return existing;
  }

  const unit = job.booking.pricingMethod.unit as PricingUnit;
  const quantity = resolveJobWorkedQuantity(unit, job.actualHours, job.completedAcres);
  const rate = Number(job.booking.rate);

  let calculatedAmount: number;
  try {
    calculatedAmount = calculateAmount({ unit, rate, quantity });
  } catch {
    // Fallback: if quantity was zero or missing for unit-based calculation,
    // evaluate base rate to avoid failing job completion.
    calculatedAmount = Math.round(rate * 100) / 100;
  }

  // Phase B Default: GST is OFF for normal farmer transactions unless explicitly toggled ON
  const subtotalAmount = calculatedAmount;
  const taxRate = 0;
  const taxAmount = 0;
  const cgstAmount = 0;
  const sgstAmount = 0;
  const igstAmount = 0;
  const isGstApplicable = false;
  const totalAmount = calculatedAmount;

  return invoiceRepository.create(
    companyId,
    {
      bookingId: job.bookingId,
      customerId: job.booking.customerId,
      subtotalAmount,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      isGstApplicable,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: "UNPAID",
    },
    tx,
  );
}

// A manual invoice has no booking to derive an amount/rate from — the
// Owner/Manager enters the total directly. Used for cases the completed-job
// pipeline doesn't cover (custom charges, backlog entries pre-dating the
// system).
export async function createManualInvoice(
  companyId: string,
  input: CreateManualInvoiceInput,
) {
  await customerService.getById(companyId, input.customerId);

  const totalAmount = Math.round(input.totalAmount * 100) / 100;

  return invoiceRepository.create(companyId, {
    customerId: input.customerId,
    description: input.description.trim(),
    subtotalAmount: totalAmount,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    status: "UNPAID",
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
  });
}

// Money received from a customer with no invoice to apply it to yet (an
// advance before a job starts, a walk-in collection). Tracked separately
// from Payment, which always requires an invoiceId.
// A customer who already owes money on open invoices and hands over cash
// isn't giving a pure "advance" — that money settles the oldest debt first,
// same as any other payment; only the leftover (if the amount exceeds what
// they owe) is a real advance/credit. Mirrors how a manual payment against
// a specific invoice works (recordPaymentTx), just applied automatically
// across every open invoice this customer has, oldest first.
export async function recordCustomerAdvance(
  companyId: string,
  user: AuthenticatedUser,
  input: RecordCustomerAdvanceInput,
) {
  await customerService.getById(companyId, input.customerId);

  const advance = await customerAdvanceRepository.create(companyId, {
    customerId: input.customerId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber,
    receivedBy: user.id,
    notes: input.notes,
  });

  const appliedTotal = await applyAmountToOutstandingInvoices(
    companyId,
    user.id,
    input.customerId,
    input.amount,
    { paymentMethod: input.paymentMethod, referenceNumber: input.referenceNumber },
  );

  if (appliedTotal === 0) {
    return advance;
  }
  const updated = await customerAdvanceRepository.setAppliedAmount(companyId, advance.id, appliedTotal);
  return updated ?? advance;
}

// Shared by recordCustomerAdvance and the one-off backfill for advances
// recorded before this auto-apply logic existed. Returns how much of
// `amount` actually got applied (<= amount; less if the customer had fewer
// open invoices than the amount received).
async function applyAmountToOutstandingInvoices(
  companyId: string,
  receivedByUserId: string,
  customerId: string,
  amount: number,
  paymentInfo: { paymentMethod: RecordCustomerAdvanceInput["paymentMethod"]; referenceNumber?: string },
): Promise<number> {
  const outstandingInvoices = await invoiceRepository.findOutstandingForCustomer(companyId, customerId);

  let remaining = Math.round(amount * 100) / 100;
  let appliedTotal = 0;
  for (const invoice of outstandingInvoices) {
    if (remaining <= 0) break;
    const applyAmount = Math.min(remaining, Number(invoice.balanceAmount));
    if (applyAmount <= 0) continue;

    await paymentRepository.recordPaymentTx(companyId, invoice.id, {
      amount: applyAmount,
      paymentMethod: paymentInfo.paymentMethod,
      referenceNumber: paymentInfo.referenceNumber,
      receivedBy: receivedByUserId,
      notes: "Auto-applied from advance payment",
    });

    appliedTotal = Math.round((appliedTotal + applyAmount) * 100) / 100;
    remaining = Math.round((remaining - applyAmount) * 100) / 100;
  }
  return appliedTotal;
}

// One-off backfill for advances recorded before auto-apply existed, whose
// unapplied balance should now settle against any open invoices the
// customer has. Safe to call repeatedly — advances that are already fully
// applied, or whose customer has no open invoices, are no-ops. Attributes
// each auto-applied payment to the advance's original receiver, not
// whoever runs the backfill.
export async function backfillUnappliedAdvances(companyId: string) {
  const advances = await customerAdvanceRepository.findAllForCompany(companyId);
  const results: Array<{ advanceId: string; appliedNow: number }> = [];

  for (const advance of advances) {
    const unapplied = Math.round((Number(advance.amount) - Number(advance.appliedAmount)) * 100) / 100;
    if (unapplied <= 0) continue;

    const appliedNow = await applyAmountToOutstandingInvoices(
      companyId,
      advance.receivedBy,
      advance.customerId,
      unapplied,
      { paymentMethod: advance.paymentMethod, referenceNumber: advance.referenceNumber ?? undefined },
    );

    if (appliedNow > 0) {
      const newAppliedAmount = Math.round((Number(advance.appliedAmount) + appliedNow) * 100) / 100;
      await customerAdvanceRepository.setAppliedAmount(companyId, advance.id, newAppliedAmount);
      results.push({ advanceId: advance.id, appliedNow });
    }
  }
  return results;
}

export async function listCustomerAdvances(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "company") {
    return customerAdvanceRepository.findAllForCompany(companyId);
  }
  if (scope.kind === "customer") {
    return customerAdvanceRepository.findAllForCompany(companyId, { customerId: scope.customerId });
  }
  return [];
}

export async function updateInvoiceTax(
  companyId: string,
  invoiceId: string,
  user: AuthenticatedUser,
  input: { isGstApplicable: boolean; taxRate?: number },
) {
  const invoice = await getInvoiceById(companyId, invoiceId, user);
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const subtotal = invoice.subtotalAmount ? Number(invoice.subtotalAmount) : Number(invoice.totalAmount);
  let taxRate = 0;
  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalAmount = subtotal;

  if (input.isGstApplicable) {
    taxRate = input.taxRate ?? (company?.defaultTaxRate ? Number(company.defaultTaxRate) : 18);
    taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
    cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
    sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
    totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  }

  const currentPaid = Number(invoice.paidAmount);
  const newBalanceAmount = Math.max(0, Math.round((totalAmount - currentPaid) * 100) / 100);
  const newStatus = newBalanceAmount === 0 ? "PAID" : currentPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      isGstApplicable: input.isGstApplicable,
      subtotalAmount: subtotal,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus,
    },
    include: invoiceRepository.invoiceIncludeRelations,
  });
}

export async function listInvoices(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "company") {
    return invoiceRepository.findAllForCompany(companyId);
  }
  if (scope.kind === "customer") {
    return invoiceRepository.findAllForCompany(companyId, { customerId: scope.customerId });
  }
  // Driver / None role gets no financial invoice listing
  return [];
}

export async function getInvoiceById(companyId: string, id: string, user: AuthenticatedUser) {
  const invoice = await invoiceRepository.findByIdScopedWithRelations(companyId, id);
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }

  const scope = await resolveCallerScope(companyId, user);
  const isVisible =
    scope.kind === "company" ||
    (scope.kind === "customer" && invoice.customerId === scope.customerId);

  if (!isVisible) {
    throw new AppError(404, "Invoice not found");
  }
  return invoice;
}

export async function receivePayment(
  companyId: string,
  invoiceId: string,
  user: AuthenticatedUser,
  input: ReceivePaymentInput,
) {
  // Fast-fail check for an obviously wrong ID; the balance/status validation
  // that actually matters happens inside recordPaymentTx's row-locked
  // transaction, not here, so a concurrent payment can't race past it.
  const invoice = await invoiceRepository.findByIdScoped(companyId, invoiceId);
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }

  return paymentRepository.recordPaymentTx(companyId, invoiceId, {
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber,
    receivedBy: user.id,
    notes: input.notes,
  });
}

export async function listPayments(companyId: string, user: AuthenticatedUser, invoiceId?: string) {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "company") {
    return paymentRepository.findAllForCompany(companyId, { invoiceId });
  }
  if (scope.kind === "customer") {
    return paymentRepository.findAllForCompany(companyId, {
      invoiceId,
      customerId: scope.customerId,
    });
  }
  return [];
}

export async function getPaymentById(companyId: string, id: string, user: AuthenticatedUser) {
  const payment = await paymentRepository.findByIdScopedWithRelations(companyId, id);
  if (!payment) {
    throw new AppError(404, "Payment not found");
  }

  const scope = await resolveCallerScope(companyId, user);
  const isVisible =
    scope.kind === "company" ||
    (scope.kind === "customer" && payment.invoice.customerId === scope.customerId);

  if (!isVisible) {
    throw new AppError(404, "Payment not found");
  }
  return payment;
}

export async function getReceipt(companyId: string, invoiceId: string, user: AuthenticatedUser) {
  const invoice = await getInvoiceById(companyId, invoiceId, user);
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError(404, "Company not found");
  }

  const job = invoice.bookingId
    ? await prisma.job.findUnique({ where: { bookingId: invoice.bookingId } })
    : null;

  return {
    receiptNumber: `REC-${invoice.invoiceNumber}`,
    title: "Agricultural Equipment Service Receipt",
    generatedAt: new Date().toISOString(),
    company: {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      themeColor: company.themeColor,
      currency: company.currency,
      invoicePrefix: company.invoicePrefix,
      address: company.address,
      city: company.city,
      district: company.district,
      state: company.state,
      pincode: company.pincode,
      country: company.country,
      phone: company.phone,
      email: company.email,
      isGstRegistered: company.isGstRegistered,
      gstin: company.gstin,
      pan: company.pan,
      bankName: company.bankName,
      accountNumber: company.accountNumber,
      ifscCode: company.ifscCode,
      upiId: company.upiId,
    },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      subtotalAmount: invoice.subtotalAmount ? Number(invoice.subtotalAmount) : Number(invoice.totalAmount),
      taxRate: invoice.taxRate ? Number(invoice.taxRate) : 0,
      taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : 0,
      cgstAmount: invoice.cgstAmount ? Number(invoice.cgstAmount) : 0,
      sgstAmount: invoice.sgstAmount ? Number(invoice.sgstAmount) : 0,
      igstAmount: invoice.igstAmount ? Number(invoice.igstAmount) : 0,
      isGstApplicable: invoice.isGstApplicable,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      balanceAmount: Number(invoice.balanceAmount),
      status: invoice.status,
    },
    customer: {
      id: invoice.customer.id,
      name: invoice.customer.name,
      phone: invoice.customer.phone,
      address: invoice.customer.address,
      village: invoice.customer.village.name,
      isGstApplicable: invoice.customer.isGstApplicable,
      gstin: invoice.customer.gstin,
    },
    service: invoice.booking
      ? {
          bookingNumber: invoice.booking.bookingNumber,
          scheduledDate: invoice.booking.scheduledDate,
          location: invoice.booking.location,
          machine: invoice.booking.machine
            ? {
                registrationNumber: invoice.booking.machine.registrationNumber,
                brand: invoice.booking.machine.brand,
                model: invoice.booking.machine.model,
              }
            : null,
          driver: invoice.booking.driver?.employee
            ? {
                name: invoice.booking.driver.employee.name,
              }
            : null,
          pricingMethod: invoice.booking.pricingMethod.label,
          rate: Number(invoice.booking.rate),
          actualHours: job?.actualHours ? Number(job.actualHours) : null,
          completedAcres: job?.completedAcres ? Number(job.completedAcres) : null,
          fuelUsedLitres: job?.fuelUsedLitres ? Number(job.fuelUsedLitres) : null,
        }
      : {
          bookingNumber: null,
          scheduledDate: invoice.invoiceDate,
          location: null,
          machine: null,
          driver: null,
          pricingMethod: "Manual Invoice",
          rate: Number(invoice.totalAmount),
          actualHours: null,
          completedAcres: null,
          fuelUsedLitres: null,
        },
    description: invoice.description,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      receivedAt: p.receivedAt,
      receivedBy: p.receiver.fullName,
      notes: p.notes,
    })),
  };
}

// ---- Dashboard aggregation pass-throughs (called by dashboard.service.ts) ----
// These do not reimplement business logic — they delegate to
// payment.repository.ts which contains all aggregation queries. Dashboard
// calls paymentService.* instead of the repository directly so module
// boundaries are preserved (§4/§3 of Goal Specification).

export function getDashboardRevenueInWindow(companyId: string, fromUtc: Date, toUtc: Date) {
  return paymentRepository.sumReceivedInWindow(companyId, fromUtc, toUtc);
}

export function getDashboardPendingBalance(companyId: string) {
  return paymentRepository.sumPendingBalance(companyId);
}

export function getDashboardPendingBalanceBefore(companyId: string, before: Date) {
  return paymentRepository.sumPendingBalanceCreatedBefore(companyId, before);
}

export function getDashboardIncomeByDay(companyId: string, fromUtc: Date, toUtc: Date) {
  return paymentRepository.getReceivedByDay(companyId, fromUtc, toUtc);
}

export function getDashboardIncomeByMonth(companyId: string, fromUtc: Date, toUtc: Date) {
  return paymentRepository.getReceivedByMonth(companyId, fromUtc, toUtc);
}

export function getDashboardPendingInvoices(companyId: string) {
  return paymentRepository.findPendingInvoices(companyId);
}

