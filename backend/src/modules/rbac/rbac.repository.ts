import { prisma } from "../../db/prisma";

export async function roleHasPermission(roleId: string, permissionKey: string): Promise<boolean> {
  const match = await prisma.rolePermission.findFirst({
    where: { roleId, permission: { key: permissionKey } },
    select: { roleId: true },
  });
  return match !== null;
}

export function findAllPermissions() {
  return prisma.permission.findMany({
    orderBy: { key: "asc" },
  });
}

export function findAllRolesForCompany(companyId: string) {
  return prisma.role.findMany({
    where: { companyId },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findRoleByIdScoped(companyId: string, id: string) {
  return prisma.role.findFirst({
    where: { id, companyId },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}
