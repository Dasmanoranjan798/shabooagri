import * as driverService from "../drivers/driver.service";
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
  const stats = await machineRepository.getMachineStats(companyId, id);
  return { ...machine, stats };
}

async function assertMachineTypeExists(companyId: string, machineTypeId: string) {
  await machineTypeService.getById(companyId, machineTypeId);
}

async function assertDriverExists(companyId: string, driverId: string) {
  await driverService.getById(companyId, driverId);
}

export async function create(companyId: string, input: CreateMachineInput) {
  await assertMachineTypeExists(companyId, input.machineTypeId);
  if (input.assignedDriverId) {
    await assertDriverExists(companyId, input.assignedDriverId);
  }
  return machineRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateMachineInput) {
  if (input.machineTypeId) {
    await assertMachineTypeExists(companyId, input.machineTypeId);
  }
  if (input.assignedDriverId) {
    await assertDriverExists(companyId, input.assignedDriverId);
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
