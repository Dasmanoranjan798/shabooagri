import type { Request, Response } from "express";
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
