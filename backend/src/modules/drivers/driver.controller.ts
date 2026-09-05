import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as driverService from "./driver.service";
import * as driverPaymentService from "./driverPayment.service";
import { createDriverSchema, updateDriverSchema } from "./driver.validators";
import { recordDriverPaymentSchema, cancelDriverPaymentSchema } from "./driverPayment.validators";

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
  const summary = await driverService.getCompensationSummary(user.companyId, req.params.id, user);
  res.status(200).json(summary);
}

// ---- Driver Payment Out (earnings vs. payments) ----

export async function getEarnings(req: Request, res: Response) {
  const user = requireUser(req);
  const driverId = await driverPaymentService.resolveDriverIdParam(user.companyId, user, req.params.id);
  const view = await driverPaymentService.getDriverEarnings(user.companyId, driverId, user);
  res.status(200).json(view);
}

export async function listPayments(req: Request, res: Response) {
  const user = requireUser(req);
  const driverId = await driverPaymentService.resolveDriverIdParam(user.companyId, user, req.params.id);
  const payments = await driverPaymentService.listDriverPayments(user.companyId, driverId, user);
  res.status(200).json(payments);
}

export async function recordPayment(req: Request, res: Response) {
  const user = requireUser(req);
  const input = recordDriverPaymentSchema.parse(req.body);
  const view = await driverPaymentService.recordDriverPayment(user.companyId, user, req.params.id, input);
  res.status(201).json(view);
}

export async function cancelPayment(req: Request, res: Response) {
  const user = requireUser(req);
  const input = cancelDriverPaymentSchema.parse(req.body);
  const view = await driverPaymentService.cancelDriverPayment(user.companyId, req.params.paymentId, user, input.reason);
  res.status(200).json(view);
}
