import { AppError } from "../../shared/errors/AppError";
import * as villageRepository from "./village.repository";
import type { CreateVillageInput, UpdateVillageInput } from "./village.validators";

export function list(companyId: string) {
  return villageRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const village = await villageRepository.findByIdScoped(companyId, id);
  if (!village) {
    throw new AppError(404, "Village not found");
  }
  return village;
}

export function create(companyId: string, input: CreateVillageInput) {
  return villageRepository.create(companyId, input.name);
}

export async function update(companyId: string, id: string, input: UpdateVillageInput) {
  const updated = await villageRepository.updateScoped(companyId, id, input.name);
  if (!updated) {
    throw new AppError(404, "Village not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await villageRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Village not found");
  }
}
