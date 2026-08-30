import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

// Only file in this module allowed to import the Prisma client.
const scoped = createScopedRepository(prisma.village);

export function findAllForCompany(companyId: string) {
  return prisma.village.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function create(companyId: string, name: string, id?: string) {
  return prisma.village.create({ data: { ...(id ? { id } : {}), companyId, name } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.VillageUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
