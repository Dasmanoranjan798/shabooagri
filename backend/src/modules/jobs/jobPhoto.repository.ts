import { prisma } from "../../db/prisma";

export function findAllForJob(companyId: string, jobId: string) {
  return prisma.jobPhoto.findMany({ where: { companyId, jobId }, orderBy: { createdAt: "desc" } });
}

export function create(companyId: string, jobId: string, fileUrl: string, uploadedBy: string, caption?: string) {
  return prisma.jobPhoto.create({ data: { companyId, jobId, fileUrl, uploadedBy, caption } });
}
