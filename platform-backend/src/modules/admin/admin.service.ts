import { prisma } from "../../db/prisma";
import * as plansRepository from "../plans/plans.repository";

// The six dashboard tiles. Deliberately just these six, at a glance —
// not the 8-page management console the old removed system had.
export async function getDashboardMetrics() {
  const expiringThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [totalSignups, payments, licensesExpiringSoon, feedbackCount, supportRequestCount] = await Promise.all([
    prisma.platformUser.count(),
    prisma.payment.findMany({ where: { status: "SUCCESS" } }),
    // Computed live from expiryDate rather than relying on a status the
    // license-expiry sweep would set — no such sweep exists yet, so a
    // status-only check would always read 0.
    prisma.license.count({
      where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] }, expiryDate: { lte: expiringThreshold, gte: new Date() } },
    }),
    prisma.feedback.count(),
    prisma.supportRequest.count({ where: { status: "OPEN" } }),
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalSignups,
    purchases: { count: payments.length, totalRevenue },
    licensesExpiringSoon,
    feedbackCount,
    supportRequestCount,
  };
}

// Prisma Decimal fields serialize to strings over JSON by default — every
// admin response coerces them to plain numbers so the frontend never has
// to guess which numeric fields need parsing.
function serializePlan(plan: Awaited<ReturnType<typeof plansRepository.findAllPlans>>[number]) {
  return { ...plan, priceAnnual: Number(plan.priceAnnual) };
}

function serializeSiteSettings(settings: Awaited<ReturnType<typeof plansRepository.getSiteSettings>>) {
  return { ...settings, extraMachinePrice: Number(settings.extraMachinePrice) };
}

export async function listPlans() {
  const plans = await plansRepository.findAllPlans();
  return plans.map(serializePlan);
}

export async function updatePlan(
  key: string,
  data: { name?: string; machineLimit?: number; priceAnnual?: number; isActive?: boolean },
) {
  const plan = await plansRepository.updatePlan(key, data);
  return serializePlan(plan);
}

export async function getSiteSettings() {
  const settings = await plansRepository.getSiteSettings();
  return serializeSiteSettings(settings);
}

export async function updateSiteSettings(data: {
  announcementEnabled?: boolean;
  announcementMessage?: string | null;
  purchasingBlocked?: boolean;
  extraMachinePrice?: number;
}) {
  const settings = await plansRepository.updateSiteSettings(data);
  return serializeSiteSettings(settings);
}
