import * as pricingMethodRepository from "./pricingMethod.repository";

export function list(companyId: string) {
  return pricingMethodRepository.findActiveForCompany(companyId);
}
