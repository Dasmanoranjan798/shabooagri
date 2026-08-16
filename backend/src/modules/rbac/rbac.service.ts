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
