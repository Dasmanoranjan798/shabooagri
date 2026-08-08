import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as machineTypeService from "./machineType.service";
import { createMachineTypeSchema, updateMachineTypeSchema } from "./machineType.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const machineTypes = await machineTypeService.list(user.companyId);
  res.status(200).json(machineTypes);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const machineType = await machineTypeService.getById(user.companyId, req.params.id);
  res.status(200).json(machineType);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createMachineTypeSchema.parse(req.body);
  const machineType = await machineTypeService.create(user.companyId, input);
  res.status(201).json(machineType);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateMachineTypeSchema.parse(req.body);
  const machineType = await machineTypeService.update(user.companyId, req.params.id, input);
  res.status(200).json(machineType);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await machineTypeService.remove(user.companyId, req.params.id);
  res.status(204).send();
}
