import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";

export class SaasAdminService {
  async getDashboardMetrics() {
    const [
      totalUsers,
      totalProfiles,
      activeLicenses,
      pendingPayments,
      expiringLicenses,
      expiredLicenses,
      successfulPayments,
      totalLeads,
      unreadEnquiries,
      pendingFeedback,
    ] = await Promise.all([
      prisma.saasUser.count({ where: { isPlatformAdmin: false } }),
      prisma.saaSCustomerProfile.count(),
      prisma.license.count({ where: { status: "LICENSE_ACTIVE" } }),
      prisma.saaSPayment.count({ where: { status: "PENDING" } }),
      prisma.license.count({ where: { status: "EXPIRING_SOON" } }),
      prisma.license.count({ where: { status: "EXPIRED" } }),
      prisma.saaSPayment.findMany({ where: { status: "SUCCESS" } }),
      prisma.saaSLead.count(),
      prisma.contactEnquiry.count({ where: { status: "UNREAD" } }),
      prisma.customerFeedback.count({ where: { status: "SUBMITTED" } }),
    ]);

    const totalRevenue = successfulPayments.reduce(
      (sum, p) => sum + Number(p.totalAmount || 0),
      0
    );

    return {
      totalUsers,
      totalCustomers: totalUsers,
      totalProfiles,
      activeLicenses,
      pendingPayments,
      expiringLicenses,
      expiredLicenses,
      totalRevenue,
      totalRevenueAmount: totalRevenue,
      totalLeads,
      unreadEnquiries,
      pendingFeedback,
    };
  }

  async listCustomers(search?: string) {
    const where: any = { isPlatformAdmin: false };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { customerProfile: { businessName: { contains: search, mode: "insensitive" } } },
        { customerProfile: { contactPerson: { contains: search, mode: "insensitive" } } },
        { customerProfile: { phone: { contains: search } } },
      ];
    }

    const users = await prisma.saasUser.findMany({
      where,
      include: {
        customerProfile: true,
        licenses: { include: { company: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => {
      const activeLic = u.licenses.find((l) => l.status === "LICENSE_ACTIVE") || u.licenses[0];
      return {
        id: u.id,
        email: u.email,
        phone: u.phone,
        status: u.status,
        createdAt: u.createdAt,
        businessName: u.customerProfile?.businessName || "N/A",
        contactPerson: u.customerProfile?.contactPerson || "N/A",
        city: u.customerProfile?.city || "",
        state: u.customerProfile?.state || "",
        gstin: u.customerProfile?.gstin || "",
        tenantSlug: activeLic?.company?.slug || null,
        companyName: activeLic?.company?.name || null,
        licenseStatus: activeLic?.status || "REGISTERED",
        licenseNumber: activeLic?.licenseNumber || "N/A",
        lastPaymentStatus: u.payments[0]?.status || "NONE",
      };
    });
  }

  async listLicenses(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return prisma.license.findMany({
      where,
      include: {
        saasUser: { include: { customerProfile: true } },
        company: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async extendLicense(adminUserId: string, licenseId: string, extensionDays: number, reason: string) {
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new AppError(404, "License record not found");
    }

    const currentExpiry = license.expiryDate ? new Date(license.expiryDate) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: {
        expiryDate: newExpiry,
        status: "LICENSE_ACTIVE",
        notes: `[ADMIN EXTENDED ${extensionDays} DAYS] Reason: ${reason} (Original Expiry: ${currentExpiry.toISOString()})`,
      },
    });

    await prisma.auditLog.create({
      data: {
        saasUserId: adminUserId,
        entityType: "License",
        entityId: licenseId,
        action: "ADMIN_LICENSE_EXTENDED",
        changes: { extensionDays, reason, newExpiry },
      },
    });

    return updated;
  }

  async listPayments(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return prisma.saaSPayment.findMany({
      where,
      include: {
        saasUser: { include: { customerProfile: true } },
        license: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listLeads() {
    return prisma.saaSLead.findMany({
      include: { assignedAdmin: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateLeadStatus(leadId: string, status: any, followUpNotes?: string, adminId?: string) {
    return prisma.saaSLead.update({
      where: { id: leadId },
      data: {
        status,
        followUpNotes,
        assignedAdminId: adminId || undefined,
      },
    });
  }

  async listEnquiries() {
    return prisma.contactEnquiry.findMany({
      include: { assignedAdmin: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateEnquiryStatus(enquiryId: string, status: any, responseNotes?: string, adminId?: string) {
    return prisma.contactEnquiry.update({
      where: { id: enquiryId },
      data: {
        status,
        responseNotes,
        assignedAdminId: adminId || undefined,
      },
    });
  }

  async listFeedback() {
    return prisma.customerFeedback.findMany({
      include: {
        saasUser: { include: { customerProfile: true } },
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateFeedbackStatus(feedbackId: string, status: any, adminNotes?: string) {
    return prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: {
        status,
        adminNotes,
      },
    });
  }
}
