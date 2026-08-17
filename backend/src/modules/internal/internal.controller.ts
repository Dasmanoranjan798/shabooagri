import type { Request, Response } from "express";
import * as internalService from "./internal.service";
import { provisionCompanySchema, updatePlanSchema } from "./internal.validators";

export async function provisionCompany(req: Request, res: Response) {
  const input = provisionCompanySchema.parse(req.body);
  const result = await internalService.provisionCompany(input);
  res.status(result.alreadyProvisioned ? 200 : 201).json(result);
}

export async function updatePlan(req: Request, res: Response) {
  const input = updatePlanSchema.parse(req.body);
  const result = await internalService.updatePlan(input);
  res.status(200).json(result);
}
