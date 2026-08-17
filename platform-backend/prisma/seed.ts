import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Starting values (§ "pricing tiers, owner-editable, not hardcoded") —
// seeded once here as data; every read after this goes through
// PricingPlan/SiteSettings, never a literal in application code. The
// admin dashboard (Checkpoint 3) is how these actually get changed going
// forward.
const PLANS = [
  { key: "starter", name: "Starter", machineLimit: 3, priceAnnual: 5000, sortOrder: 1 },
  { key: "growth", name: "Growth", machineLimit: 10, priceAnnual: 16000, sortOrder: 2 },
  { key: "business", name: "Business", machineLimit: 30, priceAnnual: 42000, sortOrder: 3 },
] as const;

async function main() {
  for (const plan of PLANS) {
    await prisma.pricingPlan.upsert({
      where: { key: plan.key },
      update: { name: plan.name, machineLimit: plan.machineLimit, priceAnnual: plan.priceAnnual, sortOrder: plan.sortOrder },
      create: plan,
    });
  }

  const existingSettings = await prisma.siteSettings.findFirst();
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: { announcementEnabled: false, purchasingBlocked: false, extraMachinePrice: 2000 },
    });
  }

  console.log(`Seeded ${PLANS.length} pricing plans and site settings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
