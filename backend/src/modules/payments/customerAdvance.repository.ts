import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export const advanceIncludeRelations = {
  customer: true,
  receiver: {
    select: { id: true, fullName: true },
  },
} satisfies Prisma.CustomerAdvanceInclude;

export interface AdvanceListFilter {
  customerId?: string;
}

// Read-only. A CustomerAdvance row represents a customer's advance/credit
// balance — the leftover of an overpayment, created inside
// payment.repository.recordPaymentTx (the single authoritative write path).
// There is deliberately no create/update helper here: credit is never
// entered standalone, only produced as a side effect of a normal payment.
export function findAllForCompany(companyId: string, filter: AdvanceListFilter = {}) {
  return prisma.customerAdvance.findMany({
    where: { companyId, ...filter },
    include: advanceIncludeRelations,
    orderBy: { receivedAt: "desc" },
  });
}
