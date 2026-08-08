import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

// Only file in this module allowed to import the Prisma client.
const scoped = createScopedRepository(prisma.machine);

const includeRelations = { machineType: true, assignedDriver: true } satisfies Prisma.MachineInclude;

export function findAllForCompany(companyId: string) {
  return prisma.machine.findMany({
    where: { companyId },
    include: includeRelations,
    orderBy: { registrationNumber: "asc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.machine.findFirst({ where: { id, companyId }, include: includeRelations });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function create(companyId: string, data: Omit<Prisma.MachineUncheckedCreateInput, "companyId">) {
  return prisma.machine.create({ data: { ...data, companyId } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.MachineUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
