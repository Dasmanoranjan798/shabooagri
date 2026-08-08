import * as machineTypeService from "../machine-types/machineType.service";
import { AppError } from "../../shared/errors/AppError";
import * as machineRepository from "./machine.repository";
import type { CreateMachineInput, UpdateMachineInput } from "./machine.validators";

export function list(companyId: string) {
  return machineRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const machine = await machineRepository.findByIdScopedWithRelations(companyId, id);
  if (!machine) {
    throw new AppError(404, "Machine not found");
  }
  return machine;
}

// Cross-module read, not a duplicated query: this calls the Machine Types
// module's own service (which already 404s on a bad id) instead of
// re-querying the machine_types table here.
//
// assignedDriverId is NOT similarly validated at this layer — the Drivers
// module doesn't exist until the module built immediately after this one,
// so an invalid assignedDriverId is currently only caught by the database's
// foreign key constraint (surfaced as a generic 409 by errorMiddleware).
// Worth revisiting once Drivers exists, for a friendlier 400.
async function assertMachineTypeExists(companyId: string, machineTypeId: string) {
  await machineTypeService.getById(companyId, machineTypeId);
}

export async function create(companyId: string, input: CreateMachineInput) {
  await assertMachineTypeExists(companyId, input.machineTypeId);
  return machineRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateMachineInput) {
  if (input.machineTypeId) {
    await assertMachineTypeExists(companyId, input.machineTypeId);
  }
  const updated = await machineRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Machine not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await machineRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Machine not found");
  }
}
