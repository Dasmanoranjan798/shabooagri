import { prisma } from "../../src/db/prisma";
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from "../../src/shared/seedData";

// Seeds the 4 system roles + their permission wiring for a single test
// company, mirroring internal.service.provisionCompany. Tests must NOT borrow
// a global owner role via findFirstOrThrow({ systemKey }) — roles are
// per-company, so a leftover test company's 0-permission owner role could be
// returned, breaking RBAC checks (e.g. user.manage at register). Seeding
// per-company makes every test self-contained and order-independent.
//
// Permissions themselves are global (shared table); we look them up by key.
export async function seedCompanyRoles(companyId: string): Promise<Record<string, string>> {
  const allPermissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  const roleIdByKey: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.create({
      data: { companyId, name: roleDef.name, systemKey: roleDef.systemKey },
    });
    roleIdByKey[roleDef.systemKey] = role.id;
    for (const permissionKey of ROLE_PERMISSIONS[roleDef.systemKey]) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId } });
    }
  }
  return roleIdByKey;
}
