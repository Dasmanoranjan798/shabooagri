import { AppError } from "../../shared/errors/AppError";
import * as rbacRepository from "./rbac.repository";

export async function userHasPermission(roleId: string, permissionKey: string): Promise<boolean> {
  return rbacRepository.roleHasPermission(roleId, permissionKey);
}

export async function listPermissions() {
  return rbacRepository.findAllPermissions();
}

export async function listRoles(companyId: string) {
  return rbacRepository.findAllRolesForCompany(companyId);
}

export async function getRoleById(companyId: string, id: string) {
  const role = await rbacRepository.findRoleByIdScoped(companyId, id);
  if (!role) {
    throw new AppError(404, "Role not found");
  }
  return role;
}

export async function createRole(companyId: string, name: string, permissionKeys: string[]) {
  if (!name.trim()) {
    throw new AppError(400, "Role name is required");
  }
  return rbacRepository.createRole(companyId, name.trim(), permissionKeys);
}

export async function updateRole(companyId: string, id: string, name?: string, permissionKeys?: string[]) {
  const existing = await rbacRepository.findRoleByIdScoped(companyId, id);
  if (!existing) {
    throw new AppError(404, "Role not found");
  }
  if (existing.isSystemRole && name && name !== existing.name) {
    throw new AppError(400, "Cannot rename system roles");
  }
  const updated = await rbacRepository.updateRole(companyId, id, name?.trim(), permissionKeys);
  if (!updated) {
    throw new AppError(404, "Role not found");
  }
  return updated;
}

export async function deleteRole(companyId: string, id: string) {
  const existing = await rbacRepository.findRoleByIdScoped(companyId, id);
  if (!existing) {
    throw new AppError(404, "Role not found");
  }
  if (existing.isSystemRole) {
    throw new AppError(400, "Cannot delete system roles");
  }
  const deleted = await rbacRepository.deleteRole(companyId, id);
  if (!deleted) {
    throw new AppError(400, "Cannot delete role in use by active users");
  }
  return { message: "Role deleted" };
}

export async function assignUserRole(companyId: string, userId: string, roleId: string) {
  const updated = await rbacRepository.assignUserRole(companyId, userId, roleId);
  if (!updated) {
    throw new AppError(404, "User or Role not found");
  }
  return updated;
}
