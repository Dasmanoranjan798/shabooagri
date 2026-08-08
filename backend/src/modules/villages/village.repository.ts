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

export function create(companyId: string, name: string) {
  return prisma.village.create({ data: { companyId, name } });
}

export function updateScoped(companyId: string, id: string, name: string) {
  return scoped.updateScoped(companyId, id, { name });
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
