import { prisma } from "../../db/prisma";

// Only file in this module allowed to import the Prisma client.
export function findAllForJob(companyId: string, jobId: string) {
  return prisma.jobFuelEntry.findMany({ where: { companyId, jobId }, orderBy: { recordedAt: "desc" } });
}

export function create(
  companyId: string,
  jobId: string,
  machineId: string,
  litres: number,
  cost: number | undefined,
  recordedBy: string,
) {
  return prisma.jobFuelEntry.create({ data: { companyId, jobId, machineId, litres, cost, recordedBy } });
}

export async function sumLitresForJob(companyId: string, jobId: string): Promise<number> {
  const result = await prisma.jobFuelEntry.aggregate({
    where: { companyId, jobId },
    _sum: { litres: true },
  });
  return result._sum.litres != null ? Number(result._sum.litres) : 0;
}
