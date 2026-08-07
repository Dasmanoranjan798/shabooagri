import { prisma } from "../../db/prisma";

// Only file in the RBAC module allowed to import the Prisma client.
// There is no create/update/delete here on purpose — Phase 1 has no
// admin API to edit roles or permissions (§2); role_permissions is
// populated once by prisma/seed.ts and only ever read at request time.

export async function roleHasPermission(roleId: string, permissionKey: string): Promise<boolean> {
  const match = await prisma.rolePermission.findFirst({
    where: { roleId, permission: { key: permissionKey } },
    select: { roleId: true },
  });
  return match !== null;
}
