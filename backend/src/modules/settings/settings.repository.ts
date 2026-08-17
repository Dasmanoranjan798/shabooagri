import { prisma } from "../../db/prisma";

// Only file in this module allowed to import the Prisma client.

// Phase 1: read/write company profile and terminology settings.
// No admin UI yet (§9, §10); the API is the interface for future config UI.

export function findCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      themeColor: true,
      accentColor: true,
      currency: true,
      timezone: true,
      language: true,
      invoicePrefix: true,
      address: true,
      city: true,
      district: true,
      state: true,
      pincode: true,
      country: true,
      phone: true,
      email: true,
      isGstRegistered: true,
      gstin: true,
      pan: true,
      bankName: true,
      accountNumber: true,
      ifscCode: true,
      upiId: true,
      defaultTaxRate: true,
      taxInclusive: true,
      serviceAlertHours: true,
      insuranceAlertDays: true,
      licenseAlertDays: true,
      requireJobPhoto: true,
      requireJobFuelLog: true,
      planKey: true,
      machineLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      terminologySettings: {
        select: { id: true, termKey: true, displayLabelSingular: true, displayLabelPlural: true },
      },
    },
  });
}

export async function updateCompanyProfile(
  id: string,
  data: {
    name?: string;
    invoicePrefix?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    isGstRegistered?: boolean;
    gstin?: string | null;
    pan?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    upiId?: string | null;
    defaultTaxRate?: number | null;
    taxInclusive?: boolean;
    serviceAlertHours?: number;
    insuranceAlertDays?: number;
    licenseAlertDays?: number;
    requireJobPhoto?: boolean;
    requireJobFuelLog?: boolean;
  },
) {
  return prisma.company.update({ where: { id }, data });
}
