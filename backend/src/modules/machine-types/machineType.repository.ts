import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.machineType);

export function findAllForCompany(companyId: string) {
  return prisma.machineType.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function create(companyId: string, name: string) {
  return prisma.machineType.create({ data: { companyId, name } });
}

export function updateScoped(companyId: string, id: string, name: string) {
  return scoped.updateScoped(companyId, id, { name });
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
