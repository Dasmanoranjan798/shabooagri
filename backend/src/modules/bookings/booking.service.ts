import type { Booking, BookingStatus } from "@prisma/client";
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
import { calculateAmount, type PricingUnit } from "../../shared/pricing/pricing-calculator";
import * as bookingAttachmentRepository from "./bookingAttachment.repository";
import * as bookingRepository from "./booking.repository";
import type { CreateBookingInput, UpdateBookingInput } from "./booking.validators";

// §7 workflow order. A status can only move forward along this graph, or
// sideways into CANCELLED — never skip a step (e.g. Pending -> Completed)
// and never leave a terminal state. Encoded here, not in the DB, so the
// rule can gain nuance later (e.g. requiring a reason on cancel) without a
// migration.
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["WORKING", "CANCELLED"],
  WORKING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

type BookingWithRelations = Booking & {
  pricingMethod: { unit: string | null };
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
  const unit = booking.pricingMethod.unit as PricingUnit;
  const quantity = resolveEstimatedQuantity(unit, booking.estimatedHours, booking.estimatedAcres);
  let estimatedAmount: number | null;
  try {
    estimatedAmount = calculateAmount({ unit, rate: Number(booking.rate), quantity });
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
  params: { machineId?: string | null; driverId?: string | null; scheduledDate: Date; excludeBookingId?: string },
) {
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
    pricingMethodService.getById(companyId, input.pricingMethodId),
    authService.getUserForCompany(companyId, managerId),
    input.machineId ? assertMachineExists(companyId, input.machineId) : Promise.resolve(),
    input.driverId ? assertDriverExists(companyId, input.driverId) : Promise.resolve(),
  ]);

  if (input.machineId || input.driverId) {
    await assertNoScheduleConflict(companyId, {
      machineId: input.machineId,
      driverId: input.driverId,
      scheduledDate: input.scheduledDate,
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
    pricingMethodId: input.pricingMethodId,
    rate: input.rate,
    notes: input.notes,
    createdBy: creatorId,
  });

  return withEstimatedAmount(booking);
}

export async function updateDetails(companyId: string, id: string, input: UpdateBookingInput) {
  await Promise.all([
    input.customerId ? customerService.getById(companyId, input.customerId) : Promise.resolve(),
    input.villageId ? villageService.getById(companyId, input.villageId) : Promise.resolve(),
    input.pricingMethodId ? pricingMethodService.getById(companyId, input.pricingMethodId) : Promise.resolve(),
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

export async function updateStatus(companyId: string, id: string, nextStatus: BookingStatus) {
  const booking = await bookingRepository.findByIdScopedWithRelations(companyId, id);
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[booking.status];
  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new AppError(400, `Cannot transition a booking from ${booking.status} to ${nextStatus}`);
  }

  // §7 step 5 ("machine travels to location") is the point a Job — which
  // requires both machineId and driverId to be non-null per its schema —
  // can meaningfully exist. Rather than create it silently incomplete,
  // reject the transition itself if either is still unassigned; this also
  // gives a booking's own "on the way" status real meaning (there IS a
  // machine+driver en route, not just a status label).
  if (nextStatus === "ON_THE_WAY" && (!booking.machineId || !booking.driverId)) {
    throw new AppError(400, "A booking needs both a machine and a driver assigned before it can go on the way");
  }

  const updated = await bookingRepository.updateScopedWithRelations(companyId, id, { status: nextStatus });

  if (nextStatus === "ON_THE_WAY") {
    await jobService.createForBooking(companyId, id, updated!.machineId!, updated!.driverId!);
  }

  if (nextStatus === "COMPLETED") {
    await jobService.completeForBooking(companyId, id);
  }

  return withEstimatedAmount(updated!);
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
  return withEstimatedAmount(updated);
}

export async function remove(companyId: string, id: string) {
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
