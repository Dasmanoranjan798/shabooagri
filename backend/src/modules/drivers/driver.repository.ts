import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.driver);

const includeRelations = { employee: true } satisfies Prisma.DriverInclude;

export function findAllForCompany(companyId: string) {
  return prisma.driver.findMany({ where: { companyId }, include: includeRelations });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.driver.findFirst({ where: { id, companyId }, include: includeRelations });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function create(companyId: string, data: Omit<Prisma.DriverUncheckedCreateInput, "companyId">) {
  return prisma.driver.create({ data: { ...data, companyId } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.DriverUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
