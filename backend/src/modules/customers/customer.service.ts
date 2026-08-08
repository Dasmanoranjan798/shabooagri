import * as authService from "../auth/auth.service";
import * as villageService from "../villages/village.service";
import { AppError } from "../../shared/errors/AppError";
import * as customerRepository from "./customer.repository";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customer.validators";

export function list(companyId: string) {
  return customerRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const customer = await customerRepository.findByIdScopedWithRelations(companyId, id);
  if (!customer) {
    throw new AppError(404, "Customer not found");
  }
  return customer;
}

export async function create(companyId: string, input: CreateCustomerInput) {
  await villageService.getById(companyId, input.villageId);
  if (input.userId) {
    await authService.getUserForCompany(companyId, input.userId);
  }
  return customerRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateCustomerInput) {
  if (input.villageId) {
    await villageService.getById(companyId, input.villageId);
  }
  if (input.userId) {
    await authService.getUserForCompany(companyId, input.userId);
  }
  const updated = await customerRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Customer not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  const deleted = await customerRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Customer not found");
  }
}
