import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as pricingMethodService from "./pricingMethod.service";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const pricingMethods = await pricingMethodService.list(user.companyId);
  res.status(200).json(pricingMethods);
}
