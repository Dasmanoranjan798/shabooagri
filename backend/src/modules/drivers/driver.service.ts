import * as employeeService from "../employees/employee.service";
import { AppError } from "../../shared/errors/AppError";
import * as driverRepository from "./driver.repository";
import type { CreateDriverInput, UpdateDriverInput } from "./driver.validators";

export function list(companyId: string) {
  return driverRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const driver = await driverRepository.findByIdScopedWithRelations(companyId, id);
  if (!driver) {
    throw new AppError(404, "Driver not found");
  }
  return driver;
}

// Not-found is expected (most employees aren't drivers) — used for identity
// resolution (Bookings scoping a Driver user to their own assigned jobs),
// not validation, so this returns null instead of throwing.
export function getByEmployeeId(companyId: string, employeeId: string) {
  return driverRepository.findByEmployeeIdScoped(companyId, employeeId);
}

// Cross-module read via the Employees module's own service — a Driver
// profile only ever extends an existing Employee record, it never creates
// or duplicates one.
async function assertEmployeeExists(companyId: string, employeeId: string) {
  await employeeService.getById(companyId, employeeId);
}

export async function create(companyId: string, input: CreateDriverInput) {
  await assertEmployeeExists(companyId, input.employeeId);
  return driverRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateDriverInput) {
  if (input.employeeId) {
    await assertEmployeeExists(companyId, input.employeeId);
  }
  const updated = await driverRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Driver not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await driverRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Driver not found");
  }
}
