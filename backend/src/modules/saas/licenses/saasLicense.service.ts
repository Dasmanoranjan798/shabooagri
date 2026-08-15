import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { generateUniqueLicenseNumber } from "../utils/licenseNumber.util";
import type { IssueLicenseInput, UpdateLicenseStatusInput } from "./saasLicense.validation";

export class SaasLicenseService {
  async getMyLicense(saasUserId: string) {
    const licenses = await prisma.license.findMany({
      where: { saasUserId },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        payment: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            paymentReference: true,
            createdAt: true,
          },
        },
      },
    });

    return licenses;
  }

  async listAllLicenses() {
    return prisma.license.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        saasUser: {
          select: { id: true, email: true, phone: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        payment: true,
      },
    });
  }

  async issueLicense(adminSaasUserId: string, input: IssueLicenseInput) {
    const userExists = await prisma.saasUser.findUnique({
      where: { id: input.saasUserId },
    });

    if (!userExists) {
      throw new AppError(404, "Target SaaS User not found");
    }

    const licenseNumber = await generateUniqueLicenseNumber();
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    // Default 1 year validity = 365 days
    const expiryDate = input.expiryDate
      ? new Date(input.expiryDate)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        saasUserId: input.saasUserId,
        companyId: input.companyId,
        status: input.status,
        startDate,
        expiryDate,
        notes: input.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        saasUserId: adminSaasUserId,
        entityType: "License",
        entityId: license.id,
        action: "LICENSE_ISSUED",
        changes: { licenseNumber, status: input.status, saasUserId: input.saasUserId },
      },
    });

    return license;
  }

  // Nothing else in the system ever transitions a license out of
  // LICENSE_ACTIVE on its own — without this, a lapsed subscription keeps
  // full tenant access forever and the admin dashboard's expiring/expired
  // counters permanently read zero. Called on a timer from server.ts.
  // Also gives EXPIRING_SOON a real path in, not just a status admins could
  // set by hand but nothing ever produced.
  async sweepExpiredLicenses() {
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expired = await prisma.license.updateMany({
      where: {
        status: { in: ["LICENSE_ACTIVE", "EXPIRING_SOON"] },
        expiryDate: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    const expiringSoon = await prisma.license.updateMany({
      where: {
        status: "LICENSE_ACTIVE",
        expiryDate: { gte: now, lte: soonThreshold },
      },
      data: { status: "EXPIRING_SOON" },
    });

    return { expiredCount: expired.count, expiringSoonCount: expiringSoon.count };
  }

  async updateLicenseStatus(adminSaasUserId: string, licenseId: string, input: UpdateLicenseStatusInput) {
    const existing = await prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!existing) {
      throw new AppError(404, "License not found");
    }

    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: {
        status: input.status,
        notes: input.notes ? `${existing.notes || ""}\n${input.notes}`.trim() : existing.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        saasUserId: adminSaasUserId,
        entityType: "License",
        entityId: licenseId,
        action: "LICENSE_STATUS_UPDATED",
        changes: { oldStatus: existing.status, newStatus: input.status },
      },
    });

    return updated;
  }
}
