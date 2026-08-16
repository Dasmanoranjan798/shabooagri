import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export const advanceIncludeRelations = {
  customer: {
    include: { village: true },
  },
  receiver: {
    select: { id: true, fullName: true },
  },
} satisfies Prisma.CustomerAdvanceInclude;

export interface AdvanceListFilter {
  customerId?: string;
}

export function findAllForCompany(companyId: string, filter: AdvanceListFilter = {}) {
  return prisma.customerAdvance.findMany({
    where: { companyId, ...filter },
    include: advanceIncludeRelations,
    orderBy: { receivedAt: "desc" },
  });
}

export function create(
  companyId: string,
  data: Omit<Prisma.CustomerAdvanceUncheckedCreateInput, "companyId">,
) {
  return prisma.customerAdvance.create({
    data: { ...data, companyId },
    include: advanceIncludeRelations,
  });
}
