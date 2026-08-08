import * as authService from "../auth/auth.service";
import { AppError } from "../../shared/errors/AppError";
import * as employeeRepository from "./employee.repository";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./employee.validators";

export function list(companyId: string) {
  return employeeRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const employee = await employeeRepository.findByIdScoped(companyId, id);
  if (!employee) {
    throw new AppError(404, "Employee not found");
  }
  return employee;
}

// Not-found is a normal, expected outcome here (most users have no linked
// employee record) — callers use this for identity resolution (e.g.
// Bookings scoping a Driver to their own jobs), not validation, so it
// returns null instead of throwing.
export function getByUserId(companyId: string, userId: string) {
  return employeeRepository.findByUserIdScoped(companyId, userId);
}

// Cross-module read via Auth's service (not a re-query of `users`): confirms
// an optionally-supplied login account actually exists in this company
// before linking it to an employee record.
async function assertUserExists(companyId: string, userId: string) {
  await authService.getUserForCompany(companyId, userId);
}

export async function create(companyId: string, input: CreateEmployeeInput) {
  if (input.userId) {
    await assertUserExists(companyId, input.userId);
  }
  return employeeRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateEmployeeInput) {
  if (input.userId) {
    await assertUserExists(companyId, input.userId);
  }
  const updated = await employeeRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Employee not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await employeeRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Employee not found");
  }
}
