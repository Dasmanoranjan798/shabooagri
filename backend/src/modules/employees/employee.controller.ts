import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as employeeService from "./employee.service";
import { createEmployeeSchema, updateEmployeeSchema } from "./employee.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const employees = await employeeService.list(user.companyId);
  res.status(200).json(employees);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const employee = await employeeService.getById(user.companyId, req.params.id);
  res.status(200).json(employee);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createEmployeeSchema.parse(req.body);
  const employee = await employeeService.create(user.companyId, input);
  res.status(201).json(employee);
}

export async function update(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateEmployeeSchema.parse(req.body);
  const employee = await employeeService.update(user.companyId, req.params.id, input);
  res.status(200).json(employee);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await employeeService.remove(user.companyId, req.params.id);
  res.status(204).send();
}
