import { AppError } from "../../shared/errors/AppError";
import { assertNoBookingReferences } from "../../shared/utils/dependencyGuard";
import * as bookingRepository from "../bookings/booking.repository";
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
  const updated = await villageRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Village not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  // Rule 4 (§ dependency-locked deletion) — bookings.village_id is
  // ON DELETE RESTRICT at the DB level too, but that would surface as a
  // raw constraint error instead of this clear message.
  const bookingCount = await bookingRepository.countByReference(companyId, { villageId: id });
  assertNoBookingReferences("village", bookingCount);

  const deleted = await villageRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Village not found");
  }
}
