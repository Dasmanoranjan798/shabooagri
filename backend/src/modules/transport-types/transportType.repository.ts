import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function findAllForCompany(companyId: string, includeInactive = false) {
  return prisma.transportType.findMany({
    where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
  });
}

export function findByIdScoped(companyId: string, id: string) {
  return prisma.transportType.findFirst({ where: { id, companyId } });
}

export function findByNameScoped(companyId: string, name: string) {
  return prisma.transportType.findFirst({ where: { companyId, name } });
}

export function create(
  companyId: string,
  name: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.transportType.create({ data: { companyId, name } });
}

export function count(companyId: string) {
  return prisma.transportType.count({ where: { companyId } });
}
