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

export async function getMachineStats(companyId: string, machineId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const jobsToday = await prisma.job.findMany({
    where: {
      companyId,
      machineId,
      startTime: { gte: startOfDay },
    },
    include: { booking: { include: { invoice: true } } },
  });

  const jobsMonth = await prisma.job.findMany({
    where: {
      companyId,
      machineId,
      startTime: { gte: startOfMonth },
    },
    include: { booking: { include: { invoice: true } } },
  });

  const todayHours = jobsToday.reduce((sum, j) => sum + (j.actualHours ? Number(j.actualHours) : 0), 0);
  const todayIncome = jobsToday.reduce((sum, j) => sum + (j.booking?.invoice?.totalAmount ? Number(j.booking.invoice.totalAmount) : 0), 0);
  const thisMonthIncome = jobsMonth.reduce((sum, j) => sum + (j.booking?.invoice?.totalAmount ? Number(j.booking.invoice.totalAmount) : 0), 0);

  return {
    todayHours: Math.round(todayHours * 10) / 10,
    todayIncome: Math.round(todayIncome * 100) / 100,
    thisMonthIncome: Math.round(thisMonthIncome * 100) / 100,
  };
}
