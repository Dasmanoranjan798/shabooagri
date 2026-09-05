import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as customerService from "./customer.service";
import { createCustomerSchema, updateCustomerSchema } from "./customer.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const customers = await customerService.listWithFinance(user.companyId);
  res.status(200).json(customers);
}

// Distinct locality/village names across this company's customers — the
// replacement for the retired Village master list in filter/report pickers.
export async function listVillages(req: Request, res: Response) {
  const user = requireUser(req);
  const villages = await customerService.listVillages(user.companyId);
  res.status(200).json(villages);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const customer = await customerService.getById(user.companyId, req.params.id);
  res.status(200).json(customer);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createCustomerSchema.parse(req.body);
  const customer = await customerService.create(user.companyId, input);
  res.status(201).json(customer);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateCustomerSchema.parse(req.body);
  const customer = await customerService.update(user.companyId, req.params.id, input);
  res.status(200).json(customer);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await customerService.remove(user.companyId, req.params.id);
  res.status(204).send();
}
