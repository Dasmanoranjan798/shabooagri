import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
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

// Most-recent-first, capped rather than paginated — this is a lightweight
// "what's come in" view for the owner, not a full inbox/ticketing system.
export async function listFeedback() {
  return prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export async function listSupportRequests() {
  return prisma.supportRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export async function updateSupportRequestStatus(id: string, status: "OPEN" | "RESOLVED") {
  return prisma.supportRequest.update({ where: { id }, data: { status } });
}

// Customer drill-down (read-only) — from the Total Signups / Purchases
// tiles. "Current plan" and "machine limit" are read from the platform's
// own billing records (the customer's most recent License row's planKey),
// never from a live operational-DB read — this schema is deliberately
// never joined against the operational one (see schema.prisma's header
// comment on why), so this view reflects what was purchased here, not
// necessarily the tenant's live operational state if that was ever
// hand-adjusted directly in the operational DB.
async function attachCurrentPlan(planKey: string | undefined) {
  if (!planKey) return null;
  const plan = await plansRepository.findPlanByKey(planKey);
  if (!plan) return null;
  return { key: plan.key, name: plan.name, machineLimit: plan.machineLimit };
}

// Small, not paginated — same "lightweight owner view, not a full admin
// console" reasoning as listFeedback/listSupportRequests above. Signups
// are not expected to be a large enough list yet to need it; the
// frontend does client-side search rather than a server query param.
export async function listPlatformUsers() {
  const users = await prisma.platformUser.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      licenses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return Promise.all(
    users.map(async (u) => {
      const latestLicense = u.licenses[0] ?? null;
      return {
        id: u.id,
        businessName: u.businessName,
        contactPerson: u.contactPerson,
        email: u.email,
        createdAt: u.createdAt,
        currentPlan: await attachCurrentPlan(latestLicense?.planKey),
        licenseStatus: latestLicense?.status ?? null,
        licenseExpiryDate: latestLicense?.expiryDate ?? null,
      };
    }),
  );
}

export async function getPlatformUserDetail(id: string) {
  const user = await prisma.platformUser.findUnique({
    where: { id },
    include: {
      licenses: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { license: true },
      },
    },
  });
  if (!user) {
    throw new AppError(404, "Customer not found");
  }

  const latestLicense = user.licenses[0] ?? null;

  const planKeys = Array.from(new Set(user.payments.map((p) => p.planKey)));
  const plansByKey = new Map(
    (await Promise.all(planKeys.map((key) => plansRepository.findPlanByKey(key)))).filter(Boolean).map((p) => [p!.key, p!]),
  );

  const [feedback, supportRequests] = await Promise.all([
    prisma.feedback.findMany({ where: { platformUserId: id }, orderBy: { createdAt: "desc" } }),
    prisma.supportRequest.findMany({ where: { platformUserId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    id: user.id,
    businessName: user.businessName,
    contactPerson: user.contactPerson,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    pincode: user.pincode,
    gstin: user.gstin,
    pan: user.pan,
    companySlug: user.companySlug,
    createdAt: user.createdAt,
    currentPlan: await attachCurrentPlan(latestLicense?.planKey),
    currentLicense: latestLicense
      ? {
          status: latestLicense.status,
          startDate: latestLicense.startDate,
          expiryDate: latestLicense.expiryDate,
          renewalCount: latestLicense.renewalCount,
        }
      : null,
    // One combined row per purchase attempt (not two separate
    // payments/licenses tables) — a License only ever exists because of
    // exactly one successful Payment, so splitting them into separate
    // lists would just force the reader to cross-reference dates by eye.
    history: user.payments.map((p) => ({
      paymentId: p.id,
      planKey: p.planKey,
      planName: plansByKey.get(p.planKey)?.name ?? p.planKey,
      intent: p.intent,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      gatewayPaymentId: p.gatewayPaymentId,
      createdAt: p.createdAt,
      license: p.license
        ? {
            startDate: p.license.startDate,
            expiryDate: p.license.expiryDate,
            status: p.license.status,
            renewalCount: p.license.renewalCount,
          }
        : null,
    })),
    feedback,
    supportRequests,
  };
}
