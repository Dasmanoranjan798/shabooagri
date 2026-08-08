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

export async function createRole(companyId: string, name: string, permissionKeys: string[]) {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  return prisma.role.create({
    data: {
      companyId,
      name,
      isSystemRole: false,
      systemKey: null,
      rolePermissions: {
        create: permissions.map((p) => ({
          permissionId: p.id,
        })),
      },
    },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  });
}

export async function updateRole(companyId: string, id: string, name?: string, permissionKeys?: string[]) {
  const role = await prisma.role.findFirst({ where: { id, companyId } });
  if (!role) return null;

  if (permissionKeys) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: id,
        permissionId: p.id,
      })),
    });
  }

  return prisma.role.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
    },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  });
}

export async function deleteRole(companyId: string, id: string) {
  const role = await prisma.role.findFirst({ where: { id, companyId } });
  if (!role || role.isSystemRole) return false;

  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });
  return true;
}

export async function assignUserRole(companyId: string, userId: string, roleId: string) {
  const role = await prisma.role.findFirst({ where: { id: roleId, companyId } });
  if (!role) return null;

  return prisma.user.update({
    where: { id: userId },
    data: { roleId },
    select: {
      id: true,
      companyId: true,
      roleId: true,
      fullName: true,
      email: true,
      mobileNumber: true,
      status: true,
      role: {
        select: {
          id: true,
          name: true,
          systemKey: true,
          isSystemRole: true,
        },
      },
    },
  });
}
