import type { Request, Response } from "express";
import * as internalService from "./internal.service";
import { provisionCompanySchema } from "./internal.validators";

export async function provisionCompany(req: Request, res: Response) {
  const input = provisionCompanySchema.parse(req.body);
  const result = await internalService.provisionCompany(input);
  res.status(result.alreadyProvisioned ? 200 : 201).json(result);
}
