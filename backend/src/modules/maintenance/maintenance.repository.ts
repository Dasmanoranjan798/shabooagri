import { prisma } from "../../db/prisma";

// Only file in this module allowed to import the Prisma client.

// ---- Maintenance Schedules ----

export function findSchedulesForCompany(companyId: string, machineId?: string) {
  return prisma.maintenanceSchedule.findMany({
    where: { companyId, ...(machineId ? { machineId } : {}) },
    include: {
      machine: { select: { id: true, registrationNumber: true, brand: true, model: true } },
    },
    orderBy: { machine: { registrationNumber: "asc" } },
  });
}

export function findScheduleByIdScoped(companyId: string, id: string) {
  return prisma.maintenanceSchedule.findFirst({
    where: { companyId, id },
    include: {
      machine: { select: { id: true, registrationNumber: true, brand: true, model: true } },
      records: { orderBy: { serviceDate: "desc" }, take: 5 },
    },
  });
}

export function createSchedule(
  companyId: string,
  data: { machineId: string; intervalHours?: number | null; intervalDays?: number | null; description?: string | null },
) {
  return prisma.maintenanceSchedule.create({ data: { companyId, ...data } });
}

export function updateScheduleScoped(
  companyId: string,
  id: string,
  data: {
    intervalHours?: number | null;
    intervalDays?: number | null;
    description?: string | null;
    isActive?: boolean;
  },
) {
  return prisma.maintenanceSchedule.updateMany({ where: { companyId, id }, data });
}

export function deleteScheduleScoped(companyId: string, id: string) {
  return prisma.maintenanceSchedule.deleteMany({ where: { companyId, id } });
}

// ---- Maintenance Records ----

export function findRecordsForCompany(companyId: string, machineId?: string) {
  return prisma.maintenanceRecord.findMany({
    where: { companyId, ...(machineId ? { machineId } : {}) },
    include: {
      machine: { select: { id: true, registrationNumber: true, brand: true, model: true } },
      schedule: { select: { id: true, description: true } },
    },
    orderBy: { serviceDate: "desc" },
  });
}

export function findRecordByIdScoped(companyId: string, id: string) {
  return prisma.maintenanceRecord.findFirst({
    where: { companyId, id },
    include: {
      machine: { select: { id: true, registrationNumber: true, brand: true, model: true } },
      schedule: { select: { id: true, description: true } },
    },
  });
}

export function createRecord(
  companyId: string,
  data: {
    machineId: string;
    maintenanceScheduleId?: string | null;
    serviceDate: Date;
    hourMeterAtService?: number | null;
    description?: string | null;
    cost?: number | null;
    performedBy?: string | null;
  },
) {
  return prisma.maintenanceRecord.create({ data: { companyId, ...data } });
}

export function updateRecordScoped(
  companyId: string,
  id: string,
  data: {
    serviceDate?: Date;
    hourMeterAtService?: number | null;
    description?: string | null;
    cost?: number | null;
    performedBy?: string | null;
  },
) {
  return prisma.maintenanceRecord.updateMany({ where: { companyId, id }, data });
}

export function deleteRecordScoped(companyId: string, id: string) {
  return prisma.maintenanceRecord.deleteMany({ where: { companyId, id } });
}

export function findActiveSchedulesWithRecordsAndJobs(companyId: string) {
  return prisma.maintenanceSchedule.findMany({
    where: { companyId, isActive: true },
    include: {
      machine: {
        select: {
          id: true,
          registrationNumber: true,
          brand: true,
          model: true,
          createdAt: true,
          jobs: {
            where: { status: "COMPLETED" },
            select: { actualHours: true },
          },
        },
      },
      records: {
        orderBy: { serviceDate: "desc" },
        take: 1,
      },
    },
  });
}
