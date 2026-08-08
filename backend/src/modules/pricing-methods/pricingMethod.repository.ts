import { prisma } from "../../db/prisma";

// Read-only on purpose: no create/update/delete in Phase 1 (§8.2) — rows
// come from prisma/seed.ts, the same way roles/permissions are seeded.
export function findActiveForCompany(companyId: string) {
  return prisma.pricingMethod.findMany({
    where: { companyId, isActive: true },
    orderBy: { label: "asc" },
  });
}
