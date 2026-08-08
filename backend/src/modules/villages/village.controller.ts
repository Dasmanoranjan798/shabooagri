import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as villageService from "./village.service";
import { createVillageSchema, updateVillageSchema } from "./village.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const villages = await villageService.list(user.companyId);
  res.status(200).json(villages);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const village = await villageService.getById(user.companyId, req.params.id);
  res.status(200).json(village);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createVillageSchema.parse(req.body);
  const village = await villageService.create(user.companyId, input);
  res.status(201).json(village);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateVillageSchema.parse(req.body);
  const village = await villageService.update(user.companyId, req.params.id, input);
  res.status(200).json(village);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await villageService.remove(user.companyId, req.params.id);
  res.status(204).send();
}
