import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as machineService from "./machine.service";
import { createMachineSchema, updateMachineSchema } from "./machine.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const machines = await machineService.list(user.companyId);
  res.status(200).json(machines);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const machine = await machineService.getById(user.companyId, req.params.id);
  res.status(200).json(machine);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createMachineSchema.parse(req.body);
  const machine = await machineService.create(user.companyId, input);
  res.status(201).json(machine);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateMachineSchema.parse(req.body);
  const machine = await machineService.update(user.companyId, req.params.id, input);
  res.status(200).json(machine);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await machineService.remove(user.companyId, req.params.id);
  res.status(204).send();
}
