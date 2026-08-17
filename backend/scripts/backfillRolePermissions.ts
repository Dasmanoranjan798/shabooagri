// One-time reconciliation for the dependency-locked deletion feature
// (2026-08-17): adding new permission keys to shared/seedData.ts only
// affects companies provisioned *after* the change — prisma/seed.ts only
// ever touches the "pilot" company, and modules/internal's provisioning
// flow only runs once per company at signup. Every already-existing
// company's role_permissions rows are otherwise frozen at whatever
// seedData.ts looked like the day they were provisioned.
//
// This script is safe to re-run any time seedData.ts gains a new
// permission key: it only ever grants a system role a permission it's
// missing per the current ROLE_PERMISSIONS map, matched by each Role's
// systemKey. It never revokes a permission a role already has, even if
// that permission was since removed from ROLE_PERMISSIONS (a deliberate,
// separate decision, not something this script should make silently).
//
// Usage: npx tsx scripts/backfillRolePermissions.ts
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/shared/seedData";

const prisma = new PrismaClient();

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
  console.log(`[permissions] ${permissionRecords.length} keys present in the global catalog.`);

  const roles = await prisma.role.findMany({
    where: { systemKey: { not: null } },
    include: { company: { select: { slug: true } } },
  });

  let grantedCount = 0;
  for (const role of roles) {
    const desiredKeys = ROLE_PERMISSIONS[role.systemKey!] ?? [];
    const existingGrants = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(existingGrants.map((g) => g.permissionId));

    for (const key of desiredKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId || existingPermissionIds.has(permissionId)) continue;

      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId } });
      grantedCount++;
      console.log(`[grant] ${role.company.slug} / ${role.name} (${role.systemKey}) <- ${key}`);
    }
  }

  console.log(`\nDone. ${roles.length} system roles checked across all companies, ${grantedCount} new grant(s) added.`);
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
