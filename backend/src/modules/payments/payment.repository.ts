import type { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
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

export interface RecordPaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  receivedBy: string;
  notes?: string;
}

export interface UpdateInvoicePaymentState {
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
}

// Transactional write: writes the new Payment row AND updates Invoice paidAmount,
// balanceAmount, and status in the exact same database transaction — ensuring
// data consistency without DB triggers (consistent with decision #4).
export async function recordPaymentTx(
  companyId: string,
  invoiceId: string,
  paymentData: RecordPaymentData,
  invoiceUpdate: UpdateInvoicePaymentState,
) {
  return prisma.$transaction(async (tx) => {
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
        paidAmount: invoiceUpdate.paidAmount,
        balanceAmount: invoiceUpdate.balanceAmount,
        status: invoiceUpdate.status,
      },
      include: invoiceIncludeRelations,
    });

    return { payment, invoice: updatedInvoice };
  });
}
