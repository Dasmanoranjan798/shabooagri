import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function create(
  companyId: string,
  data: {
    jobId: string;
    bookingId: string;
    transportTypeId: string | null;
    transportTypeName: string;
    trips: number;
    ratePerTrip: number;
    totalAmount: number;
    recordedBy: string;
    notes?: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobTransportCharge.create({ data: { companyId, ...data } });
}

export function listForJob(
  companyId: string,
  jobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobTransportCharge.findMany({
    where: { companyId, jobId },
    orderBy: { recordedAt: "asc" },
  });
}

export async function findByIdScoped(
  companyId: string,
  id: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.jobTransportCharge.findFirst({ where: { id, companyId } });
}

export async function deleteScoped(
  companyId: string,
  id: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const existing = await tx.jobTransportCharge.findFirst({ where: { id, companyId } });
  if (!existing) return null;
  await tx.jobTransportCharge.delete({ where: { id } });
  return existing;
}

// Σ of a job's transport charges — folded into the invoice total at submit.
export async function sumForJob(
  companyId: string,
  jobId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const agg = await tx.jobTransportCharge.aggregate({
    _sum: { totalAmount: true },
    where: { companyId, jobId },
  });
  return agg._sum.totalAmount ? Number(agg._sum.totalAmount) : 0;
}
