import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as driverService from "./driver.service";
import { createDriverSchema, updateDriverSchema } from "./driver.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const drivers = await driverService.list(user.companyId);
  res.status(200).json(drivers);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const driver = await driverService.getById(user.companyId, req.params.id);
  res.status(200).json(driver);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createDriverSchema.parse(req.body);
  const driver = await driverService.create(user.companyId, input);
  res.status(201).json(driver);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateDriverSchema.parse(req.body);
  const driver = await driverService.update(user.companyId, req.params.id, input);
  res.status(200).json(driver);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await driverService.remove(user.companyId, req.params.id);
  res.status(204).send();
}

export async function getCompensationSummary(req: Request, res: Response) {
  const user = requireUser(req);
  const summary = await driverService.getCompensationSummary(user.companyId, req.params.id);
  res.status(200).json(summary);
}
