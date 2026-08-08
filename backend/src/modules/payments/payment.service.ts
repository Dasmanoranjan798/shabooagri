import type { Booking, Job, PricingMethod } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { calculateAmount, type PricingUnit } from "../../shared/pricing/pricing-calculator";
import * as invoiceRepository from "./invoice.repository";
import * as paymentRepository from "./payment.repository";
import type { ReceivePaymentInput } from "./payment.validators";

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
export async function createInvoiceForCompletedJob(companyId: string, job: JobWithRelations) {
  const existing = await invoiceRepository.findByBookingIdScoped(companyId, job.bookingId);
  if (existing) {
    return existing;
  }

  const unit = job.booking.pricingMethod.unit as PricingUnit;
  const quantity = resolveJobWorkedQuantity(unit, job.actualHours, job.completedAcres);
  const rate = Number(job.booking.rate);

  let totalAmount: number;
  try {
    totalAmount = calculateAmount({ unit, rate, quantity });
  } catch {
    // Fallback: if quantity was zero or missing for unit-based calculation,
    // evaluate base rate to avoid failing job completion.
    totalAmount = Math.round(rate * 100) / 100;
  }

  return invoiceRepository.create(companyId, {
    bookingId: job.bookingId,
    customerId: job.booking.customerId,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    status: "UNPAID",
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
  const invoice = await invoiceRepository.findByIdScoped(companyId, invoiceId);
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }

  if (invoice.status === "PAID") {
    throw new AppError(400, "Invoice is already fully paid");
  }

  const balanceAmount = Number(invoice.balanceAmount);
  if (balanceAmount <= 0) {
    throw new AppError(400, "Invoice balance is zero");
  }

  if (input.amount > balanceAmount) {
    throw new AppError(
      400,
      `Payment amount (${input.amount}) exceeds remaining balance (${balanceAmount})`,
    );
  }

  const currentPaid = Number(invoice.paidAmount);
  const totalAmount = Number(invoice.totalAmount);
  const newPaidAmount = Math.round((currentPaid + input.amount) * 100) / 100;
  const newBalanceAmount = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);
  const newStatus = newBalanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

  return paymentRepository.recordPaymentTx(
    companyId,
    invoiceId,
    {
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      receivedBy: user.id,
      notes: input.notes,
    },
    {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus,
    },
  );
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

  const job = await prisma.job.findUnique({
    where: { bookingId: invoice.bookingId },
  });

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
    },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
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
    },
    service: {
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
    },
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

