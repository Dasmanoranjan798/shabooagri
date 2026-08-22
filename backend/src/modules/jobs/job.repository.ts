import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

// Only file in this module allowed to import the Prisma client.
const scoped = createScopedRepository(prisma.job);

// `booking: true` is a shallow include of Booking's own scalar columns
// only (customerId, managerId, etc. as raw FK strings) — it does NOT
// nest into Booking's own `manager`/`creator` User relations, so this
// can't reintroduce the passwordHash/pinHash leak fixed in the Bookings
// module. Needed here so Farmer-scope filtering/visibility can check
// booking.customerId without a second query.
const includeRelations = {
  booking: {
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          village: { select: { id: true, name: true } },
        },
      },
      village: { select: { id: true, name: true } },
      pricingMethod: true,
    },
  },
  machine: true,
  driver: {
    include: {
      employee: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.JobInclude;

export interface JobListFilter {
  driverId?: string;
  bookingCustomerId?: string;
}

export function findAllForCompany(companyId: string, filter: JobListFilter = {}) {
  const { bookingCustomerId, ...rest } = filter;
  return prisma.job.findMany({
    where: {
      companyId,
      ...rest,
      ...(bookingCustomerId ? { booking: { customerId: bookingCustomerId } } : {}),
    },
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.job.findFirst({ where: { id, companyId }, include: includeRelations });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByBookingIdScoped(companyId: string, bookingId: string) {
  return prisma.job.findFirst({ where: { companyId, bookingId } });
}

export function create(companyId: string, bookingId: string, machineId: string | null, driverId: string | null) {
  return prisma.job.create({
    data: { companyId, bookingId, machineId, driverId, executionMode: "LIVE" },
    include: includeRelations,
  });
}

export function createManual(
  companyId: string,
  data: {
    bookingId: string;
    machineId: string;
    driverId: string;
    executionMode: "MANUAL" | "LIVE";
    status: "COMPLETED";
    startTime: Date;
    endTime: Date;
    totalPausedDurationSec: number;
    actualHours: number;
    completedAcres?: number;
    fuelUsedLitres?: number;
    notes?: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.job.create({
    data: { ...data, companyId },
    include: includeRelations,
  });
}

export async function updateScopedWithRelations(
  companyId: string,
  id: string,
  data: Prisma.JobUncheckedUpdateInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const existing = await tx.job.findFirst({ where: { id, companyId } });
  if (!existing) return null;
  return tx.job.update({ where: { id }, data, include: includeRelations });
}
