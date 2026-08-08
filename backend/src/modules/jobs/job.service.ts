import type { JobStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import * as fuelService from "../fuel/fuel.service";
import * as paymentService from "../payments/payment.service";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { AppError } from "../../shared/errors/AppError";
import * as jobPhotoRepository from "./jobPhoto.repository";
import * as jobRepository from "./job.repository";
import * as bookingRepository from "../bookings/booking.repository";
import * as jobStatusLogRepository from "./jobStatusLog.repository";
import * as customerService from "../customers/customer.service";
import * as driverService from "../drivers/driver.service";
import * as machineService from "../machines/machine.service";
import * as pricingMethodService from "../pricing-methods/pricingMethod.service";
import * as villageService from "../villages/village.service";
import type { CompleteJobInput, CreateManualJobInput, PauseJobInput, ResumeJobInput, StartJobInput, UpdateJobInput } from "./job.validators";

// Called only from booking.service.ts when a Booking moves to ON_THE_WAY —
// there is no client-facing "create job" endpoint. Idempotent: if a Job
// somehow already exists for this booking (the 1:1 FK would reject a
// second row anyway), return the existing one instead of erroring, so a
// defensive re-check never breaks the booking status transition it's
// embedded in.
export async function createForBooking(companyId: string, bookingId: string, machineId: string, driverId: string) {
  const existing = await jobRepository.findByBookingIdScoped(companyId, bookingId);
  if (existing) {
    return existing;
  }
  return jobRepository.create(companyId, bookingId, machineId, driverId);
}

export async function list(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "company") return jobRepository.findAllForCompany(companyId);
  if (scope.kind === "driver") return jobRepository.findAllForCompany(companyId, { driverId: scope.driverId });
  if (scope.kind === "customer") {
    return jobRepository.findAllForCompany(companyId, { bookingCustomerId: scope.customerId });
  }
  return [];
}

export async function getById(companyId: string, id: string, user: AuthenticatedUser) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) {
    throw new AppError(404, "Job not found");
  }

  const scope = await resolveCallerScope(companyId, user);
  const isVisible =
    scope.kind === "company" ||
    (scope.kind === "driver" && job.driverId === scope.driverId) ||
    (scope.kind === "customer" && job.booking.customerId === scope.customerId);

  if (!isVisible) {
    throw new AppError(404, "Job not found"); // don't leak existence out of scope
  }
  return job;
}

// The route already gates on job.update_status (only Owner/Manager/Driver
// ever hold it — Farmer never does). What that permission does NOT encode
// is that a Driver may only act on their OWN assigned job, not any job
// company-wide, even though a Manager with the same permission key can act
// on all of them. Resolved the same data-driven way as read-scoping
// (operations.view vs. an actual Driver-profile link), not a role-key
// check.
async function assertCanWriteJob(companyId: string, job: { driverId: string }, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind === "company") return;
  if (scope.kind === "driver" && job.driverId === scope.driverId) return;
  throw new AppError(403, "You are not the assigned driver for this job");
}

function assertStatus(job: { status: JobStatus }, expected: JobStatus[], action: string) {
  if (!expected.includes(job.status)) {
    throw new AppError(400, `Cannot ${action} a job that is currently ${job.status}`);
  }
}

// job_status_log is the source of truth for exactly when the most recent
// pause began; totalPausedDurationSec on the Job row is a running total
// updated here, not recomputed from scratch on every read.
async function currentPauseDurationSec(companyId: string, jobId: string): Promise<number> {
  const lastPaused = await jobStatusLogRepository.findMostRecentByStatus(companyId, jobId, "PAUSED");
  if (!lastPaused) return 0; // status is PAUSED but no log row — shouldn't happen; don't crash if it does
  return Math.max(0, Math.floor((Date.now() - lastPaused.changedAt.getTime()) / 1000));
}

function computeActualHours(startTime: Date, endTime: Date, totalPausedDurationSec: number): number {
  const elapsedSec = (endTime.getTime() - startTime.getTime()) / 1000 - totalPausedDurationSec;
  return Math.round((Math.max(0, elapsedSec) / 3600) * 100) / 100;
}

export async function start(companyId: string, id: string, user: AuthenticatedUser, input: StartJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["NOT_STARTED"], "start");

  const startTime = input.startTime ?? new Date();
  const updated = await jobRepository.updateScopedWithRelations(companyId, id, { status: "WORKING", startTime });
  await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { status: "WORKING" });
  await jobStatusLogRepository.create(companyId, id, "WORKING", user.id);
  return updated;
}

export async function pause(companyId: string, id: string, user: AuthenticatedUser, input: PauseJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["WORKING"], "pause");

  const updated = await jobRepository.updateScopedWithRelations(companyId, id, { status: "PAUSED" });
  await jobStatusLogRepository.create(companyId, id, "PAUSED", user.id, input.note);
  return updated;
}

export async function resume(companyId: string, id: string, user: AuthenticatedUser, input: ResumeJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["PAUSED"], "resume");

  const pausedDurationSec = await currentPauseDurationSec(companyId, id);
  const updated = await jobRepository.updateScopedWithRelations(companyId, id, {
    status: "WORKING",
    totalPausedDurationSec: job.totalPausedDurationSec + pausedDurationSec,
  });
  await jobStatusLogRepository.create(companyId, id, "WORKING", user.id, input.note);
  return updated;
}

export async function complete(companyId: string, id: string, user: AuthenticatedUser, input: CompleteJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["WORKING", "PAUSED"], "complete");

  // Close out an in-progress pause before computing hours, or the final
  // pause segment would silently count as worked time.
  let totalPausedDurationSec = job.totalPausedDurationSec;
  if (job.status === "PAUSED") {
    totalPausedDurationSec += await currentPauseDurationSec(companyId, id);
  }

  const endTime = input.endTime ?? new Date();
  // job.startTime is guaranteed set: assertStatus above only allows
  // WORKING/PAUSED, both unreachable without start() having run first.
  const actualHours = input.actualHours ?? computeActualHours(job.startTime!, endTime, totalPausedDurationSec);

  const updated = await jobRepository.updateScopedWithRelations(companyId, id, {
    status: "COMPLETED",
    endTime,
    totalPausedDurationSec,
    actualHours,
    ...(input.completedAcres !== undefined ? { completedAcres: input.completedAcres } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });
  await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { status: "COMPLETED" });
  await jobStatusLogRepository.create(companyId, id, "COMPLETED", user.id, input.notes);
  if (updated) {
    await paymentService.createInvoiceForCompletedJob(companyId, updated);
  }
  return updated;
}

export async function completeForBooking(companyId: string, bookingId: string) {
  const existingJob = await jobRepository.findByBookingIdScoped(companyId, bookingId);
  if (!existingJob || existingJob.status === "COMPLETED") return;

  let totalPausedDurationSec = existingJob.totalPausedDurationSec;
  if (existingJob.status === "PAUSED") {
    totalPausedDurationSec += await currentPauseDurationSec(companyId, existingJob.id);
  }

  const endTime = new Date();
  const startTime = existingJob.startTime ?? endTime;
  const actualHours = computeActualHours(startTime, endTime, totalPausedDurationSec);

  const updated = await jobRepository.updateScopedWithRelations(companyId, existingJob.id, {
    status: "COMPLETED",
    startTime,
    endTime,
    totalPausedDurationSec,
    actualHours,
  });

  if (updated) {
    await paymentService.createInvoiceForCompletedJob(companyId, updated);
  }
}

export async function updateDetails(companyId: string, id: string, user: AuthenticatedUser, input: UpdateJobInput) {
  const job = await jobRepository.findByIdScoped(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);

  return jobRepository.updateScopedWithRelations(companyId, id, input);
}

export async function addFuelEntry(
  companyId: string,
  id: string,
  user: AuthenticatedUser,
  litres: number,
  cost: number | undefined,
) {
  const job = await jobRepository.findByIdScoped(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);

  const entry = await fuelService.addEntry(companyId, id, job.machineId, user.id, litres, cost);
  // fuel_used_litres is a cached total — job_fuel_entries is the source of
  // truth, recomputed (not incremented) on every entry to stay correct
  // even if entries are ever corrected out of order.
  const totalLitres = await fuelService.sumLitresForJob(companyId, id);
  await jobRepository.updateScopedWithRelations(companyId, id, { fuelUsedLitres: totalLitres });
  return entry;
}

export async function listFuelEntries(companyId: string, id: string, user: AuthenticatedUser) {
  await getById(companyId, id, user); // enforces the same read-visibility scoping as the job itself
  return fuelService.listForJob(companyId, id);
}

export async function addPhoto(
  companyId: string,
  id: string,
  user: AuthenticatedUser,
  fileUrl: string,
  caption: string | undefined,
) {
  const job = await jobRepository.findByIdScoped(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);

  return jobPhotoRepository.create(companyId, id, fileUrl, user.id, caption);
}

export async function listPhotos(companyId: string, id: string, user: AuthenticatedUser) {
  await getById(companyId, id, user);
  return jobPhotoRepository.findAllForJob(companyId, id);
}

export async function createManualEntryJob(
  companyId: string,
  creatorUserId: string,
  user: AuthenticatedUser,
  input: CreateManualJobInput,
) {
  await Promise.all([
    customerService.getById(companyId, input.customerId),
    villageService.getById(companyId, input.villageId),
    machineService.getById(companyId, input.machineId),
    driverService.getById(companyId, input.driverId),
    pricingMethodService.getById(companyId, input.pricingMethodId),
  ]);

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (endTime < startTime) {
    throw new AppError(400, "End time cannot be earlier than start time");
  }

  const durationSec = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
  const calculatedHours = Math.round((durationSec / 3600) * 100) / 100;
  const actualHours = input.actualHours ?? calculatedHours;

  const booking = await bookingRepository.create(companyId, {
    customerId: input.customerId,
    villageId: input.villageId,
    location: input.location,
    machineId: input.machineId,
    driverId: input.driverId,
    managerId: creatorUserId,
    scheduledDate: input.scheduledDate,
    pricingMethodId: input.pricingMethodId,
    rate: input.rate,
    notes: input.notes,
    createdBy: creatorUserId,
  });

  await bookingRepository.updateScopedWithRelations(companyId, booking.id, { status: "COMPLETED" });

  const job = await jobRepository.createManual(companyId, {
    bookingId: booking.id,
    machineId: input.machineId,
    driverId: input.driverId,
    executionMode: "MANUAL",
    status: "COMPLETED",
    startTime,
    endTime,
    totalPausedDurationSec: 0,
    actualHours,
    completedAcres: input.completedAcres,
    fuelUsedLitres: input.fuelUsedLitres,
    notes: input.notes,
  });

  await jobStatusLogRepository.create(companyId, job.id, "COMPLETED", creatorUserId, "Manual after-work entry");

  if (input.fuelUsedLitres && input.fuelUsedLitres > 0) {
    await fuelService.addEntry(companyId, job.id, input.machineId, creatorUserId, input.fuelUsedLitres, undefined);
  }

  const invoice = await paymentService.createInvoiceForCompletedJob(companyId, job);

  return { ...job, invoice };
}
