import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.employee);

export function findAllForCompany(companyId: string) {
  return prisma.employee.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByUserIdScoped(companyId: string, userId: string) {
  return prisma.employee.findFirst({ where: { companyId, userId } });
}

export function create(companyId: string, data: Omit<Prisma.EmployeeUncheckedCreateInput, "companyId">) {
  return prisma.employee.create({ data: { ...data, companyId } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
