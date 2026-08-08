import { AppError } from "../../shared/errors/AppError";
import * as pricingMethodRepository from "./pricingMethod.repository";

export function list(companyId: string) {
  return pricingMethodRepository.findActiveForCompany(companyId);
}

// Used by Bookings to validate the chosen pricing method exists, belongs to
// the company, and is still active — never re-queried from another module.
export async function getById(companyId: string, id: string) {
  const method = await pricingMethodRepository.findActiveByIdScoped(companyId, id);
  if (!method) {
    throw new AppError(404, "Pricing method not found");
  }
  return method;
}
