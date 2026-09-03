import type { Request, Response } from "express";
import { z } from "zod";
import { requireUser } from "../../shared/utils/requireUser";
import * as transportTypeService from "./transportType.service";

const createTransportTypeSchema = z.object({ name: z.string().trim().min(1) });

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const types = await transportTypeService.list(user.companyId);
  res.status(200).json(types);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createTransportTypeSchema.parse(req.body);
  const type = await transportTypeService.create(user.companyId, input.name);
  res.status(201).json(type);
}
