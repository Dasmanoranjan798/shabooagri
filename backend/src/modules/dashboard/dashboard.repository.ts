import { prisma } from "../../db/prisma";

// Only file in the Dashboard module allowed to import the Prisma client.
// Handles machine-status aggregation and today's-jobs queries.
// All other aggregation (payments/fuel) stays in those modules'
// own repositories and is called via their service boundaries.

// ---------- Machine Status ----------

export interface MachineStatusCounts {
  WORKING: number;
  AVAILABLE: number;
  REPAIR: number;
  OFFLINE: number;
  total: number;
  activeUsable: number; // WORKING + AVAILABLE (machines not sidelined)
}

// Returns machine status counts for the donut chart. A single aggregation
// query avoids N+1; isActive = false machines (decommissioned) are excluded
// because they are not part of the live fleet. "Machines Working" KPI uses
// WORKING count; "Machines Working X/Y" uses WORKING / activeUsable.
export async function getMachineStatusCounts(companyId: string): Promise<MachineStatusCounts> {
  const groups = await prisma.machine.groupBy({
    by: ["status"],
    where: { companyId, isActive: true },
    _count: { id: true },
  });

  const counts = { WORKING: 0, AVAILABLE: 0, REPAIR: 0, OFFLINE: 0 };
  for (const g of groups) {
    counts[g.status as keyof typeof counts] = g._count.id;
  }
  const total = counts.WORKING + counts.AVAILABLE + counts.REPAIR + counts.OFFLINE;
  const activeUsable = counts.WORKING + counts.AVAILABLE;

  return { ...counts, total, activeUsable };
}

// ---------- Driver KPIs ----------

// A driver is "active" today when they have a job with status WORKING or
// PAUSED scheduled for today. "Paused" still means the driver is deployed
// to a site. Drivers in NOT_STARTED jobs are not yet actively working.
// Uses UTC boundaries passed in by the service (company-timezone-derived).
export async function countActiveDriversInWindow(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<number> {
  // Count distinct drivers with WORKING or PAUSED jobs whose booking
  // scheduledDate falls within today's window.
  const result = await prisma.job.groupBy({
    by: ["driverId"],
    where: {
      companyId,
      status: { in: ["WORKING", "PAUSED"] },
      booking: { scheduledDate: { gte: fromUtc, lt: toUtc } },
    },
    _count: { driverId: true },
  });
  return result.length; // distinct driver count
}

// Previous-period active driver count for comparison delta.
export async function countActiveDriversInWindow2(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<number> {
  const result = await prisma.job.groupBy({
    by: ["driverId"],
    where: {
      companyId,
      status: { in: ["WORKING", "PAUSED"] },
      booking: { scheduledDate: { gte: fromUtc, lt: toUtc } },
    },
    _count: { driverId: true },
  });
  return result.length;
}

// ---------- Job KPI ----------

// Jobs completed within a UTC window. Uses endTime (when the job was
// actually completed), not scheduledDate, to reflect actual output.
export async function countCompletedJobsInWindow(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<number> {
  return prisma.job.count({
    where: {
      companyId,
      status: "COMPLETED",
      endTime: { gte: fromUtc, lt: toUtc },
    },
  });
}

// ---------- Today's Jobs ----------

// Returns jobs whose booking.scheduledDate falls in the provided UTC window.
// For each job we include the fields required by the dashboard table:
// customer, village, machine (registration + brand/model), driver (name),
// booking status + job status, invoice total/balance, booking number,
// scheduled time, start/end time. All in one query with no N+1.
export function findJobsForDateWindow(companyId: string, fromUtc: Date, toUtc: Date) {
  return prisma.job.findMany({
    where: {
      companyId,
      booking: { scheduledDate: { gte: fromUtc, lt: toUtc } },
    },
    select: {
      id: true,
      status: true,
      startTime: true,
      endTime: true,
      actualHours: true,
      completedAcres: true,
      fuelUsedLitres: true,
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          location: true,
          customer: {
            select: {
              id: true,
              name: true,
              village: { select: { id: true, name: true } },
            },
          },
          machine: {
            select: {
              id: true,
              registrationNumber: true,
              brand: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              employee: { select: { name: true } },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ booking: { scheduledDate: "asc" } }],
  });
}

// ---------- Today's Jobs (Driver-scoped) ----------

// Same as findJobsForDateWindow but filtered to a specific driverId so a
// Driver user can never see another driver's jobs through the dashboard.
export function findJobsForDriverInDateWindow(
  companyId: string,
  driverId: string,
  fromUtc: Date,
  toUtc: Date,
) {
  return prisma.job.findMany({
    where: {
      companyId,
      driverId,
      booking: { scheduledDate: { gte: fromUtc, lt: toUtc } },
    },
    select: {
      id: true,
      status: true,
      startTime: true,
      endTime: true,
      actualHours: true,
      completedAcres: true,
      fuelUsedLitres: true,
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          location: true,
          customer: {
            select: {
              id: true,
              name: true,
              village: { select: { id: true, name: true } },
            },
          },
          machine: {
            select: {
              id: true,
              registrationNumber: true,
              brand: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              employee: { select: { name: true } },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ booking: { scheduledDate: "asc" } }],
  });
}
