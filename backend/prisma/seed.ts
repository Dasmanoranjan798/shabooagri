import { PrismaClient } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  TERMINOLOGY_DEFAULTS,
  PRICING_METHOD_DEFAULTS,
} from "../src/shared/seedData";

const prisma = new PrismaClient();

// Phase 1 is single-tenant by design (§2): exactly one company, with the
// 4 fixed system roles and their permission set from §6 pre-seeded as data.
// This is NOT the RBAC module's role-builder UI (deferred to Phase 2) — it's
// the minimum data every users.role_id / users.company_id foreign key needs
// to exist before Auth can create or log in a single user.
//
// The actual role/permission/pricing-method data lives in
// src/shared/seedData.ts, shared with modules/internal's company
// provisioning endpoint so a platform-provisioned company and the seeded
// pilot company are always bootstrapped identically.

async function main() {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: p,
      }),
    ),
  );
  const permissionIdByKey = new Map(permissionRecords.map((p) => [p.key, p.id]));

  const company = await prisma.company.upsert({
    where: { slug: "pilot" },
    update: {},
    create: {
      name: "ShabooAgri Pilot Company",
      slug: "pilot",
    },
  });

  for (const term of TERMINOLOGY_DEFAULTS) {
    await prisma.terminologySetting.upsert({
      where: { companyId_termKey: { companyId: company.id, termKey: term.termKey } },
      update: {},
      create: {
        companyId: company.id,
        termKey: term.termKey,
        displayLabelSingular: term.singular,
        displayLabelPlural: term.plural,
      },
    });
  }

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleDef.name } },
      update: { systemKey: roleDef.systemKey },
      create: {
        companyId: company.id,
        systemKey: roleDef.systemKey,
        name: roleDef.name,
        isSystemRole: true,
      },
    });

    for (const permissionKey of ROLE_PERMISSIONS[roleDef.systemKey]) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  for (const method of PRICING_METHOD_DEFAULTS) {
    await prisma.pricingMethod.upsert({
      where: { companyId_key: { companyId: company.id, key: method.key } },
      update: { label: method.label, unit: method.unit },
      create: { companyId: company.id, key: method.key, label: method.label, unit: method.unit },
    });
  }

  console.log(`Seeded company "${company.name}" (${company.slug}) with 4 system roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
