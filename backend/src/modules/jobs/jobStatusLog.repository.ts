import type { JobStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

// The append-only source of truth for a job's status history. job.status
// on the Job row itself is a convenience read of "current status"; this
// table is what job.service.ts's pause/resume timing math actually reads
// from (when did the most recent pause start, so resume/complete can
// compute how long it lasted).
export function create(companyId: string, jobId: string, status: JobStatus, changedBy: string, note?: string) {
  return prisma.jobStatusLog.create({ data: { companyId, jobId, status, changedBy, note } });
}

export function findMostRecentByStatus(companyId: string, jobId: string, status: JobStatus) {
  return prisma.jobStatusLog.findFirst({
    where: { companyId, jobId, status },
    orderBy: { changedAt: "desc" },
  });
}

export function findAllForJob(companyId: string, jobId: string) {
  return prisma.jobStatusLog.findMany({ where: { companyId, jobId }, orderBy: { changedAt: "asc" } });
}
