import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.invoice);

export const invoiceIncludeRelations = {
  customer: {
    include: {
      village: true,
    },
  },
  booking: {
    include: {
      machine: true,
      driver: {
        include: {
          employee: true,
        },
      },
      pricingMethod: true,
    },
  },
  payments: {
    include: {
      receiver: {
        select: {
          id: true,
          fullName: true,
          email: true,
          mobileNumber: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.InvoiceInclude;

export interface InvoiceListFilter {
  customerId?: string;
  bookingId?: string;
}

export function findAllForCompany(companyId: string, filter: InvoiceListFilter = {}) {
  return prisma.invoice.findMany({
    where: { companyId, ...filter },
    include: invoiceIncludeRelations,
    orderBy: { createdAt: "desc" },
  });
}

// Oldest-first so a customer payment/advance settles the longest-standing
// debt before newer invoices — standard "apply against open balance" order.
export function findOutstandingForCustomer(companyId: string, customerId: string) {
  return prisma.invoice.findMany({
    where: { companyId, customerId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    orderBy: { invoiceDate: "asc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, companyId },
    include: invoiceIncludeRelations,
  });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByBookingIdScoped(
  companyId: string,
  bookingId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.invoice.findFirst({
    where: { companyId, bookingId },
    include: invoiceIncludeRelations,
  });
}

// Sequential per company (INV-000001, INV-000002, ...) and strictly
// monotonic: companies.next_invoice_number is only ever incremented, never
// read-and-recomputed from the invoices table, so a hard-deleted invoice's
// number can never be reassigned. The increment itself is a single atomic
// UPDATE ("SET x = x + 1 RETURNING x") — Postgres serializes concurrent
// updates to the same row via its normal row lock, so two simultaneous
// invoice creations still get two distinct numbers without needing an
// explicit transaction or a retry loop.
export async function claimNextInvoiceNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true, invoicePrefix: true },
  });
  const claimedNumber = company.nextInvoiceNumber - 1;
  const prefix = company.invoicePrefix || "INV";
  return `${prefix}-${String(claimedNumber).padStart(6, "0")}`;
}

export async function create(
  companyId: string,
  data: Omit<Prisma.InvoiceUncheckedCreateInput, "companyId" | "invoiceNumber">,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const invoiceNumber = await claimNextInvoiceNumber(companyId);
  return tx.invoice.create({
    data: { ...data, companyId, invoiceNumber },
    include: invoiceIncludeRelations,
  });
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
