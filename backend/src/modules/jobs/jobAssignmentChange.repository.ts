import type { JobAssignmentField, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

// Append-only audit of Machine/Driver reassignments made while a job is PAUSED.
export function create(
  companyId: string,
  jobId: string,
  data: {
    field: JobAssignmentField;
    oldMachineId?: string | null;
    newMachineId?: string | null;
    oldDriverId?: string | null;
    newDriverId?: string | null;
    reason: string;
    changedBy: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobAssignmentChange.create({ data: { companyId, jobId, ...data } });
}

export function listForJob(
  companyId: string,
  jobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobAssignmentChange.findMany({
    where: { companyId, jobId },
    orderBy: { changedAt: "asc" },
  });
}
