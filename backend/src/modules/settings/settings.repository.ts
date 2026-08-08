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
    logoUrl?: string | null;
    themeColor?: string | null;
    accentColor?: string | null;
    currency?: string;
    timezone?: string;
    language?: string;
    invoicePrefix?: string | null;
  },
) {
  return prisma.company.update({ where: { id }, data });
}

// Upsert a single terminology setting. Called once per term key being updated.
export async function upsertTerminologySetting(
  companyId: string,
  termKey: string,
  displayLabelSingular: string,
  displayLabelPlural: string,
) {
  return prisma.terminologySetting.upsert({
    where: { companyId_termKey: { companyId, termKey } },
    create: { companyId, termKey, displayLabelSingular, displayLabelPlural },
    update: { displayLabelSingular, displayLabelPlural },
  });
}
