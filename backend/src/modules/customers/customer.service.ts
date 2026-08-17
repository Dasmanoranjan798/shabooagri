import * as authService from "../auth/auth.service";
import * as villageService from "../villages/village.service";
import { AppError } from "../../shared/errors/AppError";
import { assertNoBookingReferences } from "../../shared/utils/dependencyGuard";
import * as bookingRepository from "../bookings/booking.repository";
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

// Not-found is expected (most users aren't linked to a Customer record) —
// used for identity resolution (Bookings scoping a Farmer user to their own
// booking history), not validation, so this returns null instead of
// throwing.
export function getByUserId(companyId: string, userId: string) {
  return customerRepository.findByUserIdScoped(companyId, userId);
}

export async function create(companyId: string, input: CreateCustomerInput) {
  await villageService.getById(companyId, input.villageId);
  if (input.userId) {
    await authService.getUserForCompany(companyId, input.userId);
  }

  // Duplicate Check 1: Mobile phone uniqueness per company
  if (input.phone && input.phone.trim()) {
    const existingByPhone = await customerRepository.findByPhoneScoped(companyId, input.phone.trim());
    if (existingByPhone) {
      throw new AppError(400, `A farmer with mobile number '${input.phone.trim()}' already exists (${existingByPhone.name}).`);
    }
  }

  // Duplicate Check 2: Name + Village uniqueness per company
  const existingByNameVillage = await customerRepository.findByNameAndVillageScoped(companyId, input.name.trim(), input.villageId);
  if (existingByNameVillage) {
    throw new AppError(400, `A farmer named '${input.name.trim()}' already exists in this village.`);
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

  if (input.phone && input.phone.trim()) {
    const existingByPhone = await customerRepository.findByPhoneScoped(companyId, input.phone.trim());
    if (existingByPhone && existingByPhone.id !== id) {
      throw new AppError(400, `Another farmer with mobile number '${input.phone.trim()}' already exists (${existingByPhone.name}).`);
    }
  }
  const updated = await customerRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Customer not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  // Rule 4 (§ dependency-locked deletion) — bookings.customer_id is
  // ON DELETE RESTRICT at the DB level too, but that would surface as a
  // raw constraint error instead of this clear message.
  const bookingCount = await bookingRepository.countByReference(companyId, { customerId: id });
  assertNoBookingReferences("customer", bookingCount);

  const deleted = await customerRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Customer not found");
  }
}
