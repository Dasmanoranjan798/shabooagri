import type { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

// Only file in this module allowed to import the Prisma client.
const scoped = createScopedRepository(prisma.job);

// Canonical "this resource is physically occupied right now" set. For
// ShabooAgri ONLY a WORKING job occupies its Machine and Driver. A PAUSED job
// is temporarily stopped ("continue later") and RELEASES both resources so
// they can work another booking meanwhile — a paused job re-checks
// availability when it resumes. NOT_STARTED, STOPPED, COMPLETED and CANCELLED
// likewise hold nothing. This is the single source of truth for occupancy —
// there is deliberately no second status system on machines/drivers.
// (Note: the dashboard's own "drivers active today" KPI keeps its separate
// WORKING+PAUSED count — that is an in-progress-jobs metric, not this
// resource-conflict rule.)
export const ACTIVE_RESOURCE_OCCUPANCY: JobStatus[] = ["WORKING"];

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
          // Locality/address is a scalar on the customer now; `location` on the
          // booking below carries any transaction-specific work location.
          village: true,
          district: true,
          address: true,
        },
      },
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

export function findByIdScopedWithRelations(
  companyId: string,
  id: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.job.findFirst({ where: { id, companyId }, include: includeRelations });
}

// Serialise concurrent Start attempts that share a Machine or Driver: taking
// a row lock on the machine (and then the driver) row means two transactions
// racing to start jobs on the same resource cannot both run their conflict
// check simultaneously — the second blocks until the first commits/rolls
// back, then sees the now-active job. Locks are always taken machine-first
// then driver-first (a fixed global order across disjoint tables), so the
// wait graph has only machine→driver edges and can never form a deadlock
// cycle. Must be called inside the same transaction as the conflict check
// and the WORKING write.
export async function lockResourceRowsForUpdate(
  companyId: string,
  machineId: string,
  driverId: string,
  tx: Prisma.TransactionClient,
) {
  await tx.$queryRaw`SELECT id FROM machines WHERE id = ${machineId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM drivers WHERE id = ${driverId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
}

// Authoritative occupancy query: any OTHER job in this company that is
// currently WORKING (see ACTIVE_RESOURCE_OCCUPANCY) and shares this job's
// Machine or Driver. Returns
// just the fields the Start-conflict error message needs (booking number,
// machine registration, driver name) so the caller can name the exact
// blocking job(s). Run inside the Start transaction, after the row locks.
export function findActiveJobsForResources(
  companyId: string,
  machineId: string,
  driverId: string,
  excludeJobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.job.findMany({
    where: {
      companyId,
      id: { not: excludeJobId },
      status: { in: ACTIVE_RESOURCE_OCCUPANCY },
      OR: [{ machineId }, { driverId }],
    },
    select: {
      id: true,
      machineId: true,
      driverId: true,
      booking: { select: { bookingNumber: true } },
      machine: { select: { registrationNumber: true } },
      driver: { select: { employee: { select: { name: true } } } },
    },
  });
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
