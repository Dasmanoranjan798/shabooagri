import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.customer);

const includeRelations = { village: true } satisfies Prisma.CustomerInclude;

export function findAllForCompany(companyId: string) {
  return prisma.customer.findMany({ where: { companyId }, include: includeRelations, orderBy: { name: "asc" } });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.customer.findFirst({ where: { id, companyId }, include: includeRelations });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByUserIdScoped(companyId: string, userId: string) {
  return prisma.customer.findFirst({ where: { companyId, userId } });
}

export function findByPhoneScoped(companyId: string, phone: string) {
  return prisma.customer.findFirst({ where: { companyId, phone } });
}

export function findByNameAndVillageScoped(companyId: string, name: string, villageId: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      villageId,
      name: { equals: name, mode: "insensitive" },
    },
  });
}

export function create(companyId: string, data: Omit<Prisma.CustomerUncheckedCreateInput, "companyId">) {
  return prisma.customer.create({ data: { ...data, companyId } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.CustomerUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
