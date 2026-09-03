import type { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { AuthenticatedUser } from "../auth/auth.types";
import * as fuelService from "../fuel/fuel.service";
import * as paymentService from "../payments/payment.service";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { AppError } from "../../shared/errors/AppError";
import { assertNoNonVoidedPayments } from "../../shared/utils/dependencyGuard";
import * as jobPhotoRepository from "./jobPhoto.repository";
import * as jobRepository from "./job.repository";
import * as jobWorkSessionRepository from "./jobWorkSession.repository";
import * as jobAssignmentChangeRepository from "./jobAssignmentChange.repository";
import * as jobTransportChargeRepository from "./jobTransportCharge.repository";
import * as bookingRepository from "../bookings/booking.repository";
import * as jobStatusLogRepository from "./jobStatusLog.repository";
import * as customerService from "../customers/customer.service";
import * as driverService from "../drivers/driver.service";
import * as machineService from "../machines/machine.service";
import * as transportTypeService from "../transport-types/transportType.service";
import * as pricingMethodService from "../pricing-methods/pricingMethod.service";
import * as villageService from "../villages/village.service";
import * as settingsRepo from "../settings/settings.repository";
import type { AddTransportChargeInput, ChangeDriverInput, ChangeMachineInput, CreateManualJobInput, PauseJobInput, ResumeJobInput, StartJobInput, StopJobInput, SubmitJobInput, UpdateJobInput } from "./job.validators";

// Called from booking.service.ts's create() the instant a Booking is
// saved — there is no separate "convert to job" step or client-facing
// "create job" endpoint. machineId/driverId may be null (booking saved
// before a machine is decided); see withReadiness below for how that
// becomes the "Ready to Start" / "Awaiting Machine" card badge. Idempotent:
// if a Job somehow already exists for this booking (the 1:1 FK would
// reject a second row anyway), return the existing one instead of erroring.
export async function createForBooking(
  companyId: string,
  bookingId: string,
  machineId: string | null,
  driverId: string | null,
) {
  const existing = await jobRepository.findByBookingIdScoped(companyId, bookingId);
  if (existing) {
    return existing;
  }
  return jobRepository.create(companyId, bookingId, machineId, driverId);
}

// Called from booking.service.ts's assignMachine/assignDriver — a booking
// is often saved before a machine/driver is decided, then assigned
// afterward via those endpoints. Keeps the (still NOT_STARTED) Job Card's
// own machineId/driverId in sync so it can flip from "Awaiting Machine" to
// "Ready to Start". Once a job has actually started, its machine/driver
// are frozen — reassigning the booking's machine mid-job must not
// retroactively rewrite what's already in progress, so this is a no-op
// for any job past NOT_STARTED.
export async function syncAssignmentForBooking(
  companyId: string,
  bookingId: string,
  data: { machineId?: string | null; driverId?: string | null },
) {
  const job = await jobRepository.findByBookingIdScoped(companyId, bookingId);
  if (!job || job.status !== "NOT_STARTED") return;
  await jobRepository.updateScopedWithRelations(companyId, job.id, data);
}

// Job Cards list badge: "Ready to Start" once both machine and driver are
// assigned, "Awaiting Machine" until then. Pricing is deliberately NOT
// part of this — pricing is picked on the Live Job screen itself, right
// before Start (see start()'s own precondition below), so gating the list
// badge on it would make "Ready to Start" unreachable.
function withReadiness<T extends { machineId: string | null; driverId: string | null }>(job: T) {
  return { ...job, isReadyToStart: !!job.machineId && !!job.driverId };
}

export async function list(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  const jobs =
    scope.kind === "company"
      ? await jobRepository.findAllForCompany(companyId)
      : scope.kind === "driver"
        ? await jobRepository.findAllForCompany(companyId, { driverId: scope.driverId })
        : scope.kind === "customer"
          ? await jobRepository.findAllForCompany(companyId, { bookingCustomerId: scope.customerId })
          : [];
  return jobs.map(withReadiness);
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
  return withReadiness(job);
}

// The route already gates on job.update_status (only Owner/Manager/Driver
// ever hold it — Farmer never does). What that permission does NOT encode
// is that a Driver may only act on their OWN assigned job, not any job
// company-wide, even though a Manager with the same permission key can act
// on all of them. Resolved the same data-driven way as read-scoping
// (operations.view vs. an actual Driver-profile link), not a role-key
// check.
async function assertCanWriteJob(companyId: string, job: { driverId: string | null }, user: AuthenticatedUser) {
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

// Builds the Start-rejection message from whichever active job(s) already
// hold this job's Machine and/or Driver. One blocking job may hold both;
// two different jobs may hold one each — each conflicting booking is named
// explicitly so the operator knows exactly what to wait on. `machine`/`driver`
// are this job's own (already-loaded) relations, used for the resource label.
function buildResourceConflictMessage(
  machine: { registrationNumber: string } | null,
  driver: { employee: { name: string } } | null,
  actives: Array<{
    id: string;
    machineId: string | null;
    driverId: string | null;
    booking: { bookingNumber: string };
  }>,
  machineId: string,
  driverId: string,
): string | null {
  const machineConflict = actives.find((a) => a.machineId === machineId);
  const driverConflict = actives.find((a) => a.driverId === driverId);
  if (!machineConflict && !driverConflict) return null;

  const machineLabel = machine?.registrationNumber ?? "This machine";
  const driverLabel = driver?.employee.name ?? "This driver";

  if (machineConflict && driverConflict) {
    // Both held by the same job → single combined sentence.
    if (machineConflict.id === driverConflict.id) {
      return `Cannot start this job. Machine ${machineLabel} and Driver ${driverLabel} are currently working on ${machineConflict.booking.bookingNumber}.`;
    }
    // Held by two different jobs → name each conflict on its own line.
    return (
      `Cannot start this job.\n` +
      `Machine ${machineLabel} is working on ${machineConflict.booking.bookingNumber}.\n` +
      `Driver ${driverLabel} is working on ${driverConflict.booking.bookingNumber}.`
    );
  }
  if (machineConflict) {
    return `Cannot start this job. Machine ${machineLabel} is currently working on ${machineConflict.booking.bookingNumber}.`;
  }
  return `Cannot start this job. Driver ${driverLabel} is currently working on ${driverConflict!.booking.bookingNumber}.`;
}

// The authoritative availability gate shared by start() AND resume(): a job
// may only become WORKING if BOTH its assigned Machine and Driver are free
// (not WORKING on any other job). Must run inside a transaction — it locks the
// machine and driver rows FOR UPDATE first, so two devices racing to activate
// jobs that share a resource are serialised (exactly one wins; the other sees
// the now-active job and is rejected). Occupancy is read from the authoritative
// jobs table via ACTIVE_RESOURCE_OCCUPANCY = [WORKING] — PAUSED does NOT block.
// The freshly re-read job (under the lock) is passed in so the caller has
// already re-validated status.
async function assertResourcesAvailableForActivation(
  companyId: string,
  fresh: { id: string; machineId: string | null; driverId: string | null; machine: { registrationNumber: string } | null; driver: { employee: { name: string } } | null },
  tx: Prisma.TransactionClient,
) {
  const machineId = fresh.machineId;
  const driverId = fresh.driverId;
  if (!machineId || !driverId) {
    throw new AppError(400, "Assign a machine and driver before starting this job");
  }
  const actives = await jobRepository.findActiveJobsForResources(companyId, machineId, driverId, fresh.id, tx);
  const conflictMessage = buildResourceConflictMessage(fresh.machine, fresh.driver, actives, machineId, driverId);
  if (conflictMessage) {
    throw new AppError(409, conflictMessage);
  }
}

// Opens a new work session for the interval that starts now — records exactly
// which Machine and Driver are doing this stretch of work (Part 11). Called on
// start and on each resume, so a job whose resources changed mid-way keeps a
// truthful per-resource history that reporting sums from.
function openWorkSession(
  companyId: string,
  job: { id: string; machineId: string | null; driverId: string | null },
  startedAt: Date,
  userId: string,
  tx: Prisma.TransactionClient,
) {
  // Unreachable without machine+driver: activation already asserted both.
  return jobWorkSessionRepository.open(companyId, job.id, job.machineId!, job.driverId!, startedAt, userId, tx);
}

// Closes the job's currently-open work session (if any), stamping its end and
// exact duration. Called on pause and stop. No-op if none is open (e.g. stop
// from PAUSED, whose session pause() already closed).
async function closeOpenWorkSession(companyId: string, jobId: string, endedAt: Date, userId: string, tx: Prisma.TransactionClient) {
  const open = await jobWorkSessionRepository.findOpen(companyId, jobId, tx);
  if (!open) return;
  const durationSec = Math.max(0, Math.floor((endedAt.getTime() - open.startedAt.getTime()) / 1000));
  await jobWorkSessionRepository.close(companyId, open.id, endedAt, durationSec, userId, tx);
}

export async function start(companyId: string, id: string, user: AuthenticatedUser, input: StartJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["NOT_STARTED"], "start");

  // "Ready to Start" on the card only means machine+driver are assigned —
  // pricing is picked right here on the Live Job screen, so it's not part
  // of that badge, but Start genuinely cannot proceed without it.
  if (!job.machineId || !job.driverId) {
    throw new AppError(400, "Assign a machine and driver before starting this job");
  }
  if (!job.booking.pricingMethodId || job.booking.rate == null) {
    throw new AppError(400, "Set a pricing method and rate before starting this job");
  }

  const machineId = job.machineId;
  const driverId = job.driverId;
  const startTime = input.startTime ?? new Date();

  // Creating a future booking for a busy resource stays allowed (that guard
  // lives at booking creation); the line is drawn here, at Start. The whole
  // check-and-flip runs in one transaction that locks the machine and driver
  // rows FOR UPDATE — no second source of truth, no client-side timing check.
  return prisma.$transaction(async (tx) => {
    await jobRepository.lockResourceRowsForUpdate(companyId, machineId, driverId, tx);

    // Re-read under the lock so a same-job double-Start (or any status change
    // since the pre-transaction read) is caught authoritatively.
    const fresh = await jobRepository.findByIdScopedWithRelations(companyId, id, tx);
    if (!fresh) throw new AppError(404, "Job not found");
    assertStatus(fresh, ["NOT_STARTED"], "start");

    await assertResourcesAvailableForActivation(companyId, fresh, tx);

    const updated = await jobRepository.updateScopedWithRelations(companyId, id, { status: "WORKING", startTime }, tx);
    await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { status: "WORKING" }, tx);
    await jobStatusLogRepository.create(companyId, id, "WORKING", user.id, undefined, tx);
    await openWorkSession(companyId, fresh, startTime, user.id, tx);
    return updated;
  });
}

// WORKING → PAUSED. A pause reason is required (validator). Pausing CLOSES the
// current work session (freezing its exact worked duration) and RELEASES the
// Machine and Driver — a paused job no longer occupies them, so they can start
// another booking meanwhile. The paused job keeps all its accumulated history
// and can be resumed later (with a fresh availability check).
export async function pause(companyId: string, id: string, user: AuthenticatedUser, input: PauseJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["WORKING"], "pause");

  const pausedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(companyId, id, { status: "PAUSED" }, tx);
    await jobStatusLogRepository.create(companyId, id, "PAUSED", user.id, input.note, tx);
    await closeOpenWorkSession(companyId, id, pausedAt, user.id, tx);
    return updated;
  });
}

// PAUSED → WORKING. Performs a FRESH authoritative availability check — the
// Machine/Driver may have been taken by another job while this one was paused,
// so we never assume they are still free. Concurrency-safe via the same
// FOR UPDATE row locks as start(). On success, opens a NEW work session for
// the job's CURRENT machine/driver (which may have been reassigned while
// paused), so worked time is attributed to whoever actually resumes it.
export async function resume(companyId: string, id: string, user: AuthenticatedUser, input: ResumeJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["PAUSED"], "resume");
  if (!job.machineId || !job.driverId) {
    throw new AppError(400, "Assign a machine and driver before resuming this job");
  }

  const resumedAt = new Date();
  return prisma.$transaction(async (tx) => {
    await jobRepository.lockResourceRowsForUpdate(companyId, job.machineId!, job.driverId!, tx);

    const fresh = await jobRepository.findByIdScopedWithRelations(companyId, id, tx);
    if (!fresh) throw new AppError(404, "Job not found");
    assertStatus(fresh, ["PAUSED"], "resume");

    await assertResourcesAvailableForActivation(companyId, fresh, tx);

    const pausedDurationSec = await currentPauseDurationSec(companyId, id);
    const updated = await jobRepository.updateScopedWithRelations(
      companyId,
      id,
      {
        status: "WORKING",
        totalPausedDurationSec: fresh.totalPausedDurationSec + pausedDurationSec,
      },
      tx,
    );
    await jobStatusLogRepository.create(companyId, id, "WORKING", user.id, input.note, tx);
    await openWorkSession(companyId, fresh, resumedAt, user.id, tx);
    return updated;
  });
}

// Stop freezes the clock (endTime/actualHours computed the same way
// complete() used to) but does NOT touch acres/notes/invoice — those wait
// for submit() below. The counter itself keeps running client-side through
// the Stop-confirm dialog; this endpoint is only ever called once that
// confirmation is accepted, which is what actually freezes it.
export async function stop(companyId: string, id: string, user: AuthenticatedUser, input: StopJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["WORKING", "PAUSED"], "stop");

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
  const wasWorking = job.status === "WORKING";

  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(
      companyId,
      id,
      { status: "STOPPED", endTime, totalPausedDurationSec, actualHours },
      tx,
    );
    await jobStatusLogRepository.create(companyId, id, "STOPPED", user.id, undefined, tx);
    // Close the session still open when stopping directly from WORKING; a stop
    // from PAUSED has no open session (pause() already closed it).
    if (wasWorking) {
      await closeOpenWorkSession(companyId, id, endTime, user.id, tx);
    }
    return updated;
  });
}

// Only legal from STOPPED (a second, distinct confirmation from Stop on
// the client). This is the point of no return for a Manager/Driver — the
// job becomes COMPLETED, locked to Owner-only edits, and its invoice is
// generated from the duration Stop already recorded.
export async function submit(companyId: string, id: string, user: AuthenticatedUser, input: SubmitJobInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["STOPPED"], "submit");

  // Phase C: Backend Enforcement of Mandatory Job Completion Rules
  const company = await settingsRepo.findCompanyById(companyId);
  if (company?.requireJobPhoto) {
    const photos = await jobPhotoRepository.findAllForJob(companyId, id);
    if (photos.length === 0) {
      throw new AppError(400, "A completion photo is required before submitting this job");
    }
  }
  if (company?.requireJobFuelLog) {
    const fuelEntries = await fuelService.listForJob(companyId, id);
    if (fuelEntries.length === 0) {
      throw new AppError(400, "A fuel-log entry is required before submitting this job");
    }
  }

  // Job update, booking update, status-log write, and invoice creation must
  // all succeed together — without this, a failure partway through (e.g.
  // invoice creation) could leave the job COMPLETED with no invoice ever
  // generated and no retry path (silent revenue loss).
  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(
      companyId,
      id,
      {
        status: "COMPLETED",
        ...(input.completedAcres !== undefined ? { completedAcres: input.completedAcres } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      tx,
    );
    await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { status: "COMPLETED" }, tx);
    await jobStatusLogRepository.create(companyId, id, "COMPLETED", user.id, input.notes, tx);
    if (updated) {
      await paymentService.createInvoiceForCompletedJob(companyId, updated, tx);
    }
    return updated;
  });
}

// Rule 2 (§ dependency-locked deletion): Owner-only (gated by job.cancel
// at the route), and only reachable while no non-voided Payment is linked
// via the booking's invoice — void the payment(s) first. Mirrors
// complete()'s pattern of keeping the Booking's status in lockstep with
// the Job's: a cancelled Job leaves its Booking CANCELLED too, both
// written in one transaction, same as complete() does for COMPLETED.
//
// COMPLETED is deliberately included as a cancellable source status, not
// just NOT_STARTED/WORKING/PAUSED/STOPPED — an Invoice (and therefore a
// Payment) is only ever created via createInvoiceForCompletedJob, which
// only runs once a Job reaches COMPLETED. Excluding COMPLETED here would
// make the payment-guard below unreachable: nothing would ever have a
// linked payment left to block on. The real scenario this rule protects is
// exactly "job was completed, invoice/payment generated, now needs
// reversing" — void the payment, then cancel the (completed) job. STOPPED
// is included too — a job frozen but not yet submitted (e.g. blocked on a
// missing required photo/fuel log) still needs a way out.
export async function cancel(companyId: string, id: string, user: AuthenticatedUser, reason?: string) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  assertStatus(job, ["NOT_STARTED", "WORKING", "PAUSED", "STOPPED", "COMPLETED"], "cancel");

  const paymentCount = await paymentService.countNonVoidedPaymentsForBooking(companyId, job.bookingId);
  assertNoNonVoidedPayments(paymentCount);

  const wasWorking = job.status === "WORKING";
  const cancelledAt = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(companyId, id, { status: "CANCELLED" }, tx);
    await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { status: "CANCELLED" }, tx);
    await jobStatusLogRepository.create(companyId, id, "CANCELLED", user.id, reason, tx);
    // Cancelling from WORKING releases the resources; close the open session so
    // it doesn't dangle open forever and its worked interval stays recorded.
    if (wasWorking) {
      await closeOpenWorkSession(companyId, id, cancelledAt, user.id, tx);
    }
    return updated;
  });
}

// ---- Machine/Driver reassignment while PAUSED (Parts 4-10) -----------------
// Only allowed while the job is PAUSED (never mid-WORKING), by a user the route
// gated with machine.assign / driver.assign. Requires a reason (validator).
// Does NOT overwrite history: past work sessions already recorded the old
// resource, so updating the job's CURRENT machineId/driverId is safe — the new
// resource is used only for the NEXT session (opened on resume). The new
// resource is NOT considered occupied until the job actually resumes; that is
// why there is no availability check here (only at resume). Every change is
// audit-logged (old, new, reason, who, when).
export async function changeMachine(companyId: string, id: string, user: AuthenticatedUser, input: ChangeMachineInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["PAUSED"], "change the machine on");

  await machineService.getById(companyId, input.machineId); // 404s if not in this company
  const oldMachineId = job.machineId;
  if (oldMachineId === input.machineId) {
    throw new AppError(400, "That machine is already assigned to this job");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(companyId, id, { machineId: input.machineId }, tx);
    // Keep the booking's assignment in lockstep with the job's, as status is.
    await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { machineId: input.machineId }, tx);
    await jobAssignmentChangeRepository.create(
      companyId,
      id,
      { field: "MACHINE", oldMachineId, newMachineId: input.machineId, reason: input.reason, changedBy: user.id },
      tx,
    );
    return updated;
  });
}

export async function changeDriver(companyId: string, id: string, user: AuthenticatedUser, input: ChangeDriverInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  assertStatus(job, ["PAUSED"], "change the driver on");

  await driverService.getById(companyId, input.driverId); // 404s if not in this company
  const oldDriverId = job.driverId;
  if (oldDriverId === input.driverId) {
    throw new AppError(400, "That driver is already assigned to this job");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await jobRepository.updateScopedWithRelations(companyId, id, { driverId: input.driverId }, tx);
    await bookingRepository.updateScopedWithRelations(companyId, job.bookingId, { driverId: input.driverId }, tx);
    await jobAssignmentChangeRepository.create(
      companyId,
      id,
      { field: "DRIVER", oldDriverId, newDriverId: input.driverId, reason: input.reason, changedBy: user.id },
      tx,
    );
    return updated;
  });
}

export async function listAssignmentChanges(companyId: string, id: string, user: AuthenticatedUser) {
  await getById(companyId, id, user); // enforces the same read-visibility scoping as the job
  return jobAssignmentChangeRepository.listForJob(companyId, id);
}

export async function listWorkSessions(companyId: string, id: string, user: AuthenticatedUser) {
  await getById(companyId, id, user);
  return jobWorkSessionRepository.listForJob(companyId, id);
}

// ---- Transportation: a separate, optional, structured charge (Parts 16-21) --
// Added before final submission; must NOT touch the harvesting timer, and is
// stored structurally (never in free-text notes). total = trips × ratePerTrip,
// computed server-side (the client's total is never trusted).
export async function addTransportCharge(companyId: string, id: string, user: AuthenticatedUser, input: AddTransportChargeInput) {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  // Optional and pre-submission: allowed any time before the invoice is
  // generated (i.e. not COMPLETED) and not on a dead job (CANCELLED).
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    throw new AppError(400, "Cannot add transportation to a completed or cancelled job");
  }

  let transportTypeId: string | null = null;
  let transportTypeName: string;
  if (input.transportTypeId) {
    const type = await transportTypeService.getById(companyId, input.transportTypeId);
    transportTypeId = type.id;
    transportTypeName = type.name;
  } else if (input.transportTypeName && input.transportTypeName.trim()) {
    transportTypeName = input.transportTypeName.trim();
  } else {
    throw new AppError(400, "Select a transport type");
  }

  const totalAmount = Math.round(input.trips * input.ratePerTrip * 100) / 100;
  return jobTransportChargeRepository.create(companyId, {
    jobId: id,
    bookingId: job.bookingId,
    transportTypeId,
    transportTypeName,
    trips: input.trips,
    ratePerTrip: input.ratePerTrip,
    totalAmount,
    recordedBy: user.id,
    notes: input.notes,
  });
}

export async function listTransportCharges(companyId: string, id: string, user: AuthenticatedUser) {
  await getById(companyId, id, user);
  return jobTransportChargeRepository.listForJob(companyId, id);
}

export async function deleteTransportCharge(companyId: string, id: string, chargeId: string, user: AuthenticatedUser) {
  const job = await jobRepository.findByIdScoped(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    throw new AppError(400, "Cannot change transportation on a completed or cancelled job");
  }
  const deleted = await jobTransportChargeRepository.deleteScoped(companyId, chargeId);
  if (!deleted || deleted.jobId !== id) throw new AppError(404, "Transport charge not found");
  return deleted;
}

// Rule 3 dependency-guard support: does this booking have a Job that
// isn't itself already CANCELLED? Used by booking.service.ts before
// letting a Booking be deleted or transitioned to CANCELLED.
export async function findLinkedForBooking(companyId: string, bookingId: string) {
  return jobRepository.findByBookingIdScoped(companyId, bookingId);
}

export async function updateDetails(companyId: string, id: string, user: AuthenticatedUser, input: UpdateJobInput) {
  const job = await jobRepository.findByIdScoped(companyId, id);
  if (!job) throw new AppError(404, "Job not found");
  await assertCanWriteJob(companyId, job, user);

  // The invoice amount is calculated once from actualHours/completedAcres at
  // completion time (see paymentService.createInvoiceForCompletedJob) and never
  // recalculated. Letting those fields change afterward would silently desync
  // the job from its already-generated invoice.
  if (job.status === "COMPLETED" && (input.completedAcres !== undefined || input.actualHours !== undefined)) {
    throw new AppError(
      400,
      "Cannot change worked hours or acres on a completed job — its invoice has already been generated from these values",
    );
  }

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
  // start()'s precondition guarantees machineId is set on any job that has
  // actually begun work, which is the only time a fuel entry makes sense.
  if (!job.machineId) throw new AppError(400, "This job has no machine assigned yet");

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

  const company = await settingsRepo.findCompanyById(companyId);
  if (company?.requireJobFuelLog && (!input.fuelUsedLitres || input.fuelUsedLitres <= 0)) {
    throw new AppError(400, "A fuel-log entry is required before completing this job");
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (endTime < startTime) {
    throw new AppError(400, "End time cannot be earlier than start time");
  }

  const durationSec = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
  const calculatedHours = Math.round((durationSec / 3600) * 100) / 100;
  const actualHours = input.actualHours ?? calculatedHours;

  // Booking creation, its COMPLETED transition, the Job row, its status-log
  // entry, the fuel entry, and the invoice must all succeed together — same
  // guarantee submit() gives the live path. Without one transaction a failure
  // partway (e.g. invoice creation) could leave a COMPLETED booking/job with
  // no invoice ever generated and no retry path (silent revenue loss). The tx
  // client is threaded through every write below.
  return prisma.$transaction(async (tx) => {
    const booking = await bookingRepository.create(
      companyId,
      {
        customerId: input.customerId,
        villageId: input.villageId,
        location: input.location,
        machineId: input.machineId,
        driverId: input.driverId,
        managerId: creatorUserId,
        scheduledDate: input.scheduledDate,
        pricingMethodId: input.pricingMethodId,
        rate: input.rate,
        minimumCharge: input.minimumCharge,
        notes: input.notes,
        createdBy: creatorUserId,
      },
      tx,
    );

    await bookingRepository.updateScopedWithRelations(companyId, booking.id, { status: "COMPLETED" }, tx);

    const job = await jobRepository.createManual(
      companyId,
      {
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
      },
      tx,
    );

    await jobStatusLogRepository.create(companyId, job.id, "COMPLETED", creatorUserId, "Manual after-work entry", tx);

    if (input.fuelUsedLitres && input.fuelUsedLitres > 0) {
      await fuelService.addEntry(companyId, job.id, input.machineId, creatorUserId, input.fuelUsedLitres, undefined, tx);
    }

    const invoice = await paymentService.createInvoiceForCompletedJob(companyId, job, tx);

    return { ...job, invoice };
  });
}
