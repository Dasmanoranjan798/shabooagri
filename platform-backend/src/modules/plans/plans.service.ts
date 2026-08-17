import * as plansRepository from "./plans.repository";

// Single public read the marketing site needs before a visitor has an
// account at all: active plans, the flat extra-machine price, and
// whether an announcement banner / purchasing block is currently on.
// Both site-settings switches are independent, per design — this just
// passes both through as-is.
export async function getPublicConfig() {
  const [plans, settings] = await Promise.all([
    plansRepository.findActivePlans(),
    plansRepository.getSiteSettings(),
  ]);

  return {
    plans: plans.map((p) => ({
      key: p.key,
      name: p.name,
      machineLimit: p.machineLimit,
      priceAnnual: Number(p.priceAnnual),
    })),
    extraMachinePrice: Number(settings.extraMachinePrice),
    announcement: settings.announcementEnabled
      ? { enabled: true, message: settings.announcementMessage }
      : { enabled: false, message: null },
    purchasingBlocked: settings.purchasingBlocked,
  };
}
