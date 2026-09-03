import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

// One continuous WORKING interval. Opened on start/resume, closed on
// pause/stop. Only this file touches the prisma client for this table.

export function open(
  companyId: string,
  jobId: string,
  machineId: string,
  driverId: string,
  startedAt: Date,
  startedBy: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobWorkSession.create({
    data: { companyId, jobId, machineId, driverId, startedAt, startedBy },
  });
}

// The single still-open session for a job (endedAt null). There is at most
// one, since a job is WORKING on exactly one session at a time.
export function findOpen(
  companyId: string,
  jobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobWorkSession.findFirst({ where: { companyId, jobId, endedAt: null } });
}

export async function close(
  companyId: string,
  id: string,
  endedAt: Date,
  durationSec: number,
  endedBy: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const existing = await tx.jobWorkSession.findFirst({ where: { id, companyId } });
  if (!existing) return null;
  return tx.jobWorkSession.update({ where: { id }, data: { endedAt, durationSec, endedBy } });
}

// Chronological session list for a job — the raw work-session history used by
// the job timeline and the customer-facing work summary.
export function listForJob(
  companyId: string,
  jobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobWorkSession.findMany({
    where: { companyId, jobId },
    orderBy: { startedAt: "asc" },
    include: {
      machine: { select: { id: true, registrationNumber: true } },
      driver: { select: { id: true, employee: { select: { id: true, name: true } } } },
    },
  });
}

// Sum of *closed* session seconds for a driver across the given job statuses.
// This is the authoritative worked-time attribution for driver pay — it never
// reads job.driverId, so a mid-job driver change attributes each interval to
// whoever actually worked it.
export async function sumDurationSecByDriver(
  companyId: string,
  driverId: string,
  jobStatuses: Prisma.JobWhereInput["status"] | undefined,
): Promise<number> {
  const agg = await prisma.jobWorkSession.aggregate({
    _sum: { durationSec: true },
    where: {
      companyId,
      driverId,
      endedAt: { not: null },
      ...(jobStatuses ? { job: { status: jobStatuses } } : {}),
    },
  });
  return agg._sum.durationSec ?? 0;
}

export async function sumDurationSecByMachine(
  companyId: string,
  machineId: string,
  jobStatuses: Prisma.JobWhereInput["status"] | undefined,
): Promise<number> {
  const agg = await prisma.jobWorkSession.aggregate({
    _sum: { durationSec: true },
    where: {
      companyId,
      machineId,
      endedAt: { not: null },
      ...(jobStatuses ? { job: { status: jobStatuses } } : {}),
    },
  });
  return agg._sum.durationSec ?? 0;
}
