import { z } from "zod";

// No createJobSchema — a Job is never created via a client request. It's
// created internally by booking.service.ts the instant a Booking is saved
// (see job.service.ts's createForBooking).

export const startJobSchema = z.object({
  // Optional override for the Manager-records-after-the-fact flow (§7's
  // note); defaults to "now" for the driver-logs-live-from-the-field flow.
  startTime: z.coerce.date().optional(),
});

// A pause reason is REQUIRED (Part 6): the client sends the chosen quick-pick
// category, or the free-text explanation when "Other" is picked. The backend
// only enforces non-empty; the "Other ⇒ explanation" rule is a client concern
// (whatever text arrives is what gets stored in the pause's JobStatusLog note).
export const pauseJobSchema = z.object({
  note: z.string().trim().min(1, "A reason is required to pause"),
});

// Reassigning a PAUSED job's Machine/Driver (Parts 7/8). Reason mandatory,
// same non-empty rule as pause/resume.
export const changeMachineSchema = z.object({
  machineId: z.string().uuid(),
  reason: z.string().trim().min(1, "A reason is required to change the machine"),
});

export const changeDriverSchema = z.object({
  driverId: z.string().uuid(),
  reason: z.string().trim().min(1, "A reason is required to change the driver"),
});

// Transportation is a separate, optional, structured charge on the same job
// (Parts 16-21). total is computed server-side as trips × ratePerTrip — the
// client's value is never trusted for money.
export const addTransportChargeSchema = z.object({
  // Prefer a configured transport type; a free-text name is accepted as a
  // fallback so the master list never blocks recording a real charge.
  transportTypeId: z.string().uuid().optional(),
  transportTypeName: z.string().trim().min(1).optional(),
  trips: z.coerce.number().int().positive(),
  ratePerTrip: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

// Required, unlike pause's note: resuming from a pause must state why the
// delay happened (quick-pick reason or free text on the client) before the
// live counter is allowed to start again. Logged as this resume's
// JobStatusLog note — the pause-history record the Owner reviews later.
export const resumeJobSchema = z.object({
  note: z.string().trim().min(1, "A reason is required to resume"),
});

// Stop freezes the clock only — no acres/notes/photo-fuel gating here,
// those move to Submit (below), which is the step that actually can't be
// undone by a Manager/Driver.
export const stopJobSchema = z.object({
  endTime: z.coerce.date().optional(),
  // Manual override for the after-the-fact flow; auto-computed from
  // startTime/endTime/totalPausedDurationSec when omitted.
  actualHours: z.coerce.number().nonnegative().optional(),
});

// Only legal from STOPPED. This is the point of no return for a
// Manager/Driver — completes the job, locks it to Owner-only edits, and
// generates the invoice.
export const submitJobSchema = z.object({
  completedAcres: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

// General detail edits at any point in the job's life. Deliberately
// excludes status, startTime/endTime (only the lifecycle actions above may
// change those, to keep pause/resume timing math trustworthy) and
// fuelUsedLitres (always derived from job_fuel_entries, never set
// directly — see fuel module).
export const updateJobSchema = z.object({
  completedAcres: z.coerce.number().nonnegative().optional(),
  actualHours: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

// Reason is optional (unlike Payment/Invoice void's mandatory reason) —
// only the Payment/Invoice void action in § dependency-locked deletion
// requires one; logged as the JobStatusLog note when provided.
export const cancelJobSchema = z.object({
  reason: z.string().trim().optional(),
});

export const addFuelEntrySchema = z.object({
  litres: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative().optional(),
});

export const addJobPhotoSchema = z.object({
  caption: z.string().optional(),
});

export const createManualJobSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  villageId: z.string().uuid(),
  machineId: z.string().uuid(),
  driverId: z.string().uuid(),
  scheduledDate: z.coerce.date(),
  pricingMethodId: z.string().uuid(),
  rate: z.coerce.number().positive(),
  // Optional minimum billable floor (§8.2): final = max(metered, minimumCharge).
  minimumCharge: z.coerce.number().nonnegative().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  actualHours: z.coerce.number().nonnegative().optional(),
  completedAcres: z.coerce.number().nonnegative().optional(),
  fuelUsedLitres: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
});

export type StartJobInput = z.infer<typeof startJobSchema>;
export type PauseJobInput = z.infer<typeof pauseJobSchema>;
export type ChangeMachineInput = z.infer<typeof changeMachineSchema>;
export type ChangeDriverInput = z.infer<typeof changeDriverSchema>;
export type AddTransportChargeInput = z.infer<typeof addTransportChargeSchema>;
export type ResumeJobInput = z.infer<typeof resumeJobSchema>;
export type StopJobInput = z.infer<typeof stopJobSchema>;
export type SubmitJobInput = z.infer<typeof submitJobSchema>;
export type CancelJobInput = z.infer<typeof cancelJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type AddFuelEntryInput = z.infer<typeof addFuelEntrySchema>;
export type AddJobPhotoInput = z.infer<typeof addJobPhotoSchema>;
export type CreateManualJobInput = z.infer<typeof createManualJobSchema>;
