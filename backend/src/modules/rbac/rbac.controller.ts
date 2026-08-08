import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import * as rbacService from "./rbac.service";

export async function listPermissions(_req: Request, res: Response) {
  const permissions = await rbacService.listPermissions();
  res.status(200).json(permissions);
}

export async function listRoles(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const roles = await rbacService.listRoles(companyId);
  res.status(200).json(roles);
}

export async function getRoleById(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const role = await rbacService.getRoleById(companyId, req.params.id);
  res.status(200).json(role);
}

export async function createRole(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const { name, permissionKeys } = req.body;
  if (!name) throw new AppError(400, "Role name is required");
  const role = await rbacService.createRole(companyId, name, permissionKeys || []);
  res.status(201).json(role);
}

export async function updateRole(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const { name, permissionKeys } = req.body;
  const role = await rbacService.updateRole(companyId, req.params.id, name, permissionKeys);
  res.status(200).json(role);
}

export async function deleteRole(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const result = await rbacService.deleteRole(companyId, req.params.id);
  res.status(200).json(result);
}

export async function assignUserRole(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  const { userId, roleId } = req.body;
  if (!userId || !roleId) throw new AppError(400, "userId and roleId are required");
  const updated = await rbacService.assignUserRole(companyId, userId, roleId);
  res.status(200).json(updated);
}
