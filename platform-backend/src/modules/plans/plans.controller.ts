import type { Request, Response } from "express";
import * as plansService from "./plans.service";

// Public — no auth. The marketing site needs this before a visitor has
// an account.
export async function getPublicConfig(req: Request, res: Response) {
  const result = await plansService.getPublicConfig();
  res.status(200).json(result);
}
