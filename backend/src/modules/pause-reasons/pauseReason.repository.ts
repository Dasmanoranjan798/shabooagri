import { prisma } from "../../db/prisma";

export function findAllForCompany(companyId: string) {
  return prisma.pauseReason.findMany({
    where: { companyId, isActive: true },
    orderBy: { label: "asc" },
  });
}

// Case-insensitive duplicate lookup — "Weather" and "weather" are the same
// reason. The DB @@unique([companyId,label]) is the exact-match backstop.
export function findByLabelInsensitive(companyId: string, label: string) {
  return prisma.pauseReason.findFirst({
    where: { companyId, label: { equals: label, mode: "insensitive" } },
  });
}

export function create(companyId: string, label: string, createdBy?: string) {
  return prisma.pauseReason.create({ data: { companyId, label, createdBy } });
}

export function count(companyId: string) {
  return prisma.pauseReason.count({ where: { companyId } });
}
