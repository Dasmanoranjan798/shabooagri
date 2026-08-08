import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as settingsService from "./settings.service";
import { updateCompanyProfileSchema, updateTerminologySchema } from "./settings.validators";

export async function getCompanyProfile(req: Request, res: Response) {
  const user = requireUser(req);
  const profile = await settingsService.getCompanyProfile(user.companyId);
  res.json(profile);
}

export async function updateCompanyProfile(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateCompanyProfileSchema.parse(req.body);
  const profile = await settingsService.updateCompanyProfile(user.companyId, input);
  res.json(profile);
}

export async function updateTerminology(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateTerminologySchema.parse(req.body);
  const results = await settingsService.updateTerminology(user.companyId, input);
  res.json(results);
}
