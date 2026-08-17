import { prisma } from "../../db/prisma";

export function findActivePlans() {
  return prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findAllPlans() {
  return prisma.pricingPlan.findMany({ orderBy: { sortOrder: "asc" } });
}

export function findPlanByKey(key: string) {
  return prisma.pricingPlan.findUnique({ where: { key } });
}

export function updatePlan(key: string, data: { name?: string; machineLimit?: number; priceAnnual?: number; isActive?: boolean }) {
  return prisma.pricingPlan.update({ where: { key }, data });
}

// Singleton, application-enforced: always the single oldest row. Creates
// it with defaults on first read if seed.ts was never run.
export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: "asc" } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: {} });
}

export async function updateSiteSettings(data: {
  announcementEnabled?: boolean;
  announcementMessage?: string | null;
  purchasingBlocked?: boolean;
  extraMachinePrice?: number;
}) {
  const current = await getSiteSettings();
  return prisma.siteSettings.update({ where: { id: current.id }, data });
}
