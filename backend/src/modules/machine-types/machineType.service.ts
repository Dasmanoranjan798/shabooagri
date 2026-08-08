import { AppError } from "../../shared/errors/AppError";
import * as machineTypeRepository from "./machineType.repository";
import type { CreateMachineTypeInput, UpdateMachineTypeInput } from "./machineType.validators";

export function list(companyId: string) {
  return machineTypeRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const machineType = await machineTypeRepository.findByIdScoped(companyId, id);
  if (!machineType) {
    throw new AppError(404, "Machine type not found");
  }
  return machineType;
}

export function create(companyId: string, input: CreateMachineTypeInput) {
  return machineTypeRepository.create(companyId, input.name);
}

export async function update(companyId: string, id: string, input: UpdateMachineTypeInput) {
  const updated = await machineTypeRepository.updateScoped(companyId, id, input.name);
  if (!updated) {
    throw new AppError(404, "Machine type not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await machineTypeRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Machine type not found");
  }
}
