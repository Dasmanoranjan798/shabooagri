import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function createPayment(data: Prisma.PaymentUncheckedCreateInput) {
  return prisma.payment.create({ data });
}

export function findById(id: string) {
  return prisma.payment.findUnique({ where: { id } });
}

export function updateStatus(id: string, data: Partial<Prisma.PaymentUncheckedUpdateInput>) {
  return prisma.payment.update({ where: { id }, data });
}

export function createLicense(data: Prisma.LicenseUncheckedCreateInput) {
  return prisma.license.create({ data });
}

export function findLatestLicenseForUser(platformUserId: string) {
  return prisma.license.findFirst({
    where: { platformUserId },
    orderBy: { createdAt: "desc" },
  });
}

export function updateLicense(id: string, data: Partial<Prisma.LicenseUncheckedUpdateInput>) {
  return prisma.license.update({ where: { id }, data });
}
