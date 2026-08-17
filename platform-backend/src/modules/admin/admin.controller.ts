import type { Request, Response } from "express";
import * as adminService from "./admin.service";
import { updatePlanSchema, updateSiteSettingsSchema, updateSupportRequestSchema } from "./admin.validators";

export async function getDashboard(req: Request, res: Response) {
  const result = await adminService.getDashboardMetrics();
  res.status(200).json(result);
}

export async function listPlans(req: Request, res: Response) {
  const result = await adminService.listPlans();
  res.status(200).json(result);
}

export async function updatePlan(req: Request, res: Response) {
  const input = updatePlanSchema.parse(req.body);
  const result = await adminService.updatePlan(req.params.key, input);
  res.status(200).json(result);
}

export async function getSiteSettings(req: Request, res: Response) {
  const result = await adminService.getSiteSettings();
  res.status(200).json(result);
}

export async function updateSiteSettings(req: Request, res: Response) {
  const input = updateSiteSettingsSchema.parse(req.body);
  const result = await adminService.updateSiteSettings(input);
  res.status(200).json(result);
}

export async function listFeedback(req: Request, res: Response) {
  const result = await adminService.listFeedback();
  res.status(200).json(result);
}

export async function listSupportRequests(req: Request, res: Response) {
  const result = await adminService.listSupportRequests();
  res.status(200).json(result);
}

export async function updateSupportRequest(req: Request, res: Response) {
  const input = updateSupportRequestSchema.parse(req.body);
  const result = await adminService.updateSupportRequestStatus(req.params.id, input.status);
  res.status(200).json(result);
}

export async function listPlatformUsers(req: Request, res: Response) {
  const result = await adminService.listPlatformUsers();
  res.status(200).json(result);
}

export async function getPlatformUserDetail(req: Request, res: Response) {
  const result = await adminService.getPlatformUserDetail(req.params.id);
  res.status(200).json(result);
}
