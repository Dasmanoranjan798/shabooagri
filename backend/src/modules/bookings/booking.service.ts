import type { Booking } from "@prisma/client";
import * as authService from "../auth/auth.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import * as customerService from "../customers/customer.service";
import * as driverService from "../drivers/driver.service";
import * as jobService from "../jobs/job.service";
import * as machineService from "../machines/machine.service";
import * as pricingMethodService from "../pricing-methods/pricingMethod.service";
import * as villageService from "../villages/village.service";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { AppError } from "../../shared/errors/AppError";
import { assertBookingDeletable } from "../../shared/utils/dependencyGuard";
import { calculateAmount, type PricingUnit } from "../../shared/pricing/pricing-calculator";
import * as bookingAttachmentRepository from "./bookingAttachment.repository";
import * as bookingRepository from "./booking.repository";
import type { CreateBookingInput, UpdateBookingInput } from "./booking.validators";

type BookingWithRelations = Booking & {
  pricingMethod: { unit: string | null } | null;
};

// Booking has no stored amount column (only rate + pricingMethodId +
// estimated hours/acres) — the estimate is derived on read via the shared
// pricing-calculator, the same function Invoices will call later against
// actual job hours. Never persisted here.
function resolveEstimatedQuantity(
  unit: PricingUnit,
  estimatedHours: unknown,
  estimatedAcres: unknown,
): number | null {
  if (unit === "hour") return estimatedHours != null ? Number(estimatedHours) : null;
  if (unit === "minute") return estimatedHours != null ? Number(estimatedHours) * 60 : null;
  if (unit === "acre") return estimatedAcres != null ? Number(estimatedAcres) : null;
  return null;
}

function withEstimatedAmount<T extends BookingWithRelations>(booking: T) {
  // Pricing is now assigned on the Live Job screen right before Start, not
  // at booking time — most new bookings have no pricingMethod/rate yet.
  if (!booking.pricingMethod || booking.rate == null) {
    return { ...booking, estimatedAmount: null as number | null };
  }
  const unit = booking.pricingMethod.unit as PricingUnit;
  const quantity = resolveEstimatedQuantity(unit, booking.estimatedHours, booking.estimatedAcres);
  const minimumCharge = booking.minimumCharge != null ? Number(booking.minimumCharge) : undefined;
  let estimatedAmount: number | null;
  try {
    estimatedAmount = calculateAmount({ unit, rate: Number(booking.rate), quantity, minimumCharge });
  } catch {
    // e.g. an hourly pricing method with no estimatedHours entered yet —
    // not an error, just not computable until the estimate is filled in.
    estimatedAmount = null;
  }
  return { ...booking, estimatedAmount };
}

export async function list(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  const bookings =
    scope.kind === "company"
      ? await bookingRepository.findAllForCompany(companyId)
      : scope.kind === "driver"
        ? await bookingRepository.findAllForCompany(companyId, { driverId: scope.driverId })
        : scope.kind === "customer"
          ? await bookingRepository.findAllForCompany(companyId, { customerId: scope.customerId })
          : [];
  return bookings.map(withEstimatedAmount);
}

export async function getById(companyId: string, id: string, user: AuthenticatedUser) {
  const booking = await bookingRepository.findByIdScopedWithRelations(companyId, id);
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const scope = await resolveCallerScope(companyId, user);
  const isVisible =
    scope.kind === "company" ||
    (scope.kind === "driver" && booking.driverId === scope.driverId) ||
    (scope.kind === "customer" && booking.customerId === scope.customerId);

  if (!isVisible) {
    // 404, not 403 — a Driver/Farmer should not learn that a booking
    // outside their scope exists at all.
    throw new AppError(404, "Booking not found");
  }
  return withEstimatedAmount(booking);
}

async function assertMachineExists(companyId: string, machineId: string) {
  await machineService.getById(companyId, machineId);
}

async function assertDriverExists(companyId: string, driverId: string) {
  await driverService.getById(companyId, driverId);
}

// H-01: no schedule-overlap check existed anywhere in booking/assignment —
// two bookings could get the same machine and driver on the same day with
// no warning. scheduledDate has no reliable duration to compare against
// (see booking.repository.ts), so this checks same-day conflicts against
// any other still-active booking.
async function assertNoScheduleConflict(
  companyId: string,
  params: { machineId?: string | null; driverId?: string | null; scheduledDate: Date; excludeBookingId?: string; ignoreConflict?: boolean },
) {
  if (params.ignoreConflict) return;
  if (params.machineId) {
    const conflict = await bookingRepository.findConflictingBookingForMachine(
      companyId,
      params.machineId,
      params.scheduledDate,
      params.excludeBookingId,
    );
    if (conflict) {
      throw new AppError(
        409,
        `This machine is already assigned to booking ${conflict.bookingNumber} on this date`,
      );
    }
  }
  if (params.driverId) {
    const conflict = await bookingRepository.findConflictingBookingForDriver(
      companyId,
      params.driverId,
      params.scheduledDate,
      params.excludeBookingId,
    );
    if (conflict) {
      throw new AppError(
        409,
        `This driver is already assigned to booking ${conflict.bookingNumber} on this date`,
      );
    }
  }
}

export async function create(companyId: string, creatorId: string, input: CreateBookingInput) {
  // §7 step 1: the creating Manager is the booking's manager by default;
  // an explicit managerId lets an Owner create a booking on a Manager's
  // behalf.
  const managerId = input.managerId ?? creatorId;

  await Promise.all([
    customerService.getById(companyId, input.customerId),
    villageService.getById(companyId, input.villageId),
    input.pricingMethodId ? pricingMethodService.getById(companyId, input.pricingMethodId) : Promise.resolve(),
    authService.getUserForCompany(companyId, managerId),
    input.machineId ? assertMachineExists(companyId, input.machineId) : Promise.resolve(),
    input.driverId ? assertDriverExists(companyId, input.driverId) : Promise.resolve(),
  ]);

  if (input.machineId || input.driverId) {
    await assertNoScheduleConflict(companyId, {
      machineId: input.machineId,
      driverId: input.driverId,
      scheduledDate: input.scheduledDate,
      ignoreConflict: (input as any).ignoreConflict,
    });
  }

  const booking = await bookingRepository.create(companyId, {
    customerId: input.customerId,
    villageId: input.villageId,
    location: input.location,
    machineId: input.machineId,
    driverId: input.driverId,
    managerId,
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    estimatedHours: input.estimatedHours,
    estimatedAcres: input.estimatedAcres,
    workDescription: input.workDescription,
    pricingMethodId: input.pricingMethodId,
    rate: input.rate,
    minimumCharge: input.minimumCharge,
    notes: input.notes,
    createdBy: creatorId,
  });

  // Saving a booking creates its Job Card immediately — no separate
  // "convert to job" step. Machine/driver may still be null (card shows
  // "Awaiting Machine" until assigned).
  await jobService.createForBooking(companyId, booking.id, input.machineId ?? null, input.driverId ?? null);

  return withEstimatedAmount(booking);
}

export async function updateDetails(companyId: string, id: string, input: UpdateBookingInput) {
  await Promise.all([
    input.customerId ? customerService.getById(companyId, input.customerId) : Promise.resolve(),
    input.villageId ? villageService.getById(companyId, input.villageId) : Promise.resolve(),
    input.managerId ? authService.getUserForCompany(companyId, input.managerId) : Promise.resolve(),
  ]);

  // Rescheduling a booking that already has a machine/driver assigned can
  // create a new same-day conflict at the new date — re-check against the
  // booking's own current assignment (machineId/driverId can't be changed
  // through this endpoint — see updateBookingSchema).
  if (input.scheduledDate) {
    const existing = await bookingRepository.findByIdScoped(companyId, id);
    if (!existing) {
      throw new AppError(404, "Booking not found");
    }
    await assertNoScheduleConflict(companyId, {
      machineId: existing.machineId,
      driverId: existing.driverId,
      scheduledDate: input.scheduledDate,
      excludeBookingId: id,
    });
  }

  const updated = await bookingRepository.updateScopedWithRelations(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Booking not found");
  }
  return withEstimatedAmount(updated);
}

export async function assignMachine(companyId: string, id: string, machineId: string | null) {
  if (machineId) {
    await assertMachineExists(companyId, machineId);
    const booking = await bookingRepository.findByIdScoped(companyId, id);
    if (!booking) {
      throw new AppError(404, "Booking not found");
    }
    await assertNoScheduleConflict(companyId, {
      machineId,
      scheduledDate: booking.scheduledDate,
      excludeBookingId: id,
    });
  }
  const updated = await bookingRepository.updateScopedWithRelations(companyId, id, { machineId });
  if (!updated) {
    throw new AppError(404, "Booking not found");
  }
  // Keeps a not-yet-started Job Card's own machineId in sync — a booking is
  // often saved before a machine is decided, then assigned here afterward.
  // Without this, "Awaiting Machine" could never flip to "Ready to Start".
  await jobService.syncAssignmentForBooking(companyId, id, { machineId });
  return withEstimatedAmount(updated);
}

export async function assignDriver(companyId: string, id: string, driverId: string | null) {
  if (driverId) {
    await assertDriverExists(companyId, driverId);
    const booking = await bookingRepository.findByIdScoped(companyId, id);
    if (!booking) {
      throw new AppError(404, "Booking not found");
    }
    await assertNoScheduleConflict(companyId, {
      driverId,
      scheduledDate: booking.scheduledDate,
      excludeBookingId: id,
    });
  }
  const updated = await bookingRepository.updateScopedWithRelations(companyId, id, { driverId });
  if (!updated) {
    throw new AppError(404, "Booking not found");
  }
  await jobService.syncAssignmentForBooking(companyId, id, { driverId });
  return withEstimatedAmount(updated);
}

// Called from the Live Job screen right before Start — pricing is picked
// there, not at booking creation (see createBookingSchema's comment).
// Whatever is set here is what drives the live price display and the
// invoice generated on Submit.
export async function assignPricing(
  companyId: string,
  id: string,
  pricingMethodId: string,
  rate: number,
  minimumCharge?: number | null,
) {
  await pricingMethodService.getById(companyId, pricingMethodId);
  const updated = await bookingRepository.updateScopedWithRelations(companyId, id, {
    pricingMethodId,
    rate,
    // Explicitly set (null clears any prior floor) so editing pricing can also
    // remove a minimum, not just add one.
    minimumCharge: minimumCharge ?? null,
  });
  if (!updated) {
    throw new AppError(404, "Booking not found");
  }
  return withEstimatedAmount(updated);
}

export async function remove(companyId: string, id: string) {
  // Rule 3 (§ dependency-locked deletion): checked before the delete
  // itself — jobs.booking_id is ON DELETE RESTRICT at the DB level too,
  // but that would surface as a raw constraint error instead of this
  // clear message telling the caller what to do about it.
  const linkedJob = await jobService.findLinkedForBooking(companyId, id);
  assertBookingDeletable(!!linkedJob);

  const deleted = await bookingRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Booking not found");
  }
}

export async function listAttachments(companyId: string, bookingId: string, user: AuthenticatedUser) {
  await getById(companyId, bookingId, user); // enforces the same visibility scoping + existence check
  return bookingAttachmentRepository.findAllForBooking(companyId, bookingId);
}

export async function addAttachment(companyId: string, bookingId: string, uploadedBy: string, fileUrl: string) {
  const booking = await bookingRepository.findByIdScoped(companyId, bookingId);
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }
  return bookingAttachmentRepository.create(companyId, bookingId, fileUrl, uploadedBy);
}
