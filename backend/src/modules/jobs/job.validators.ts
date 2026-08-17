import { z } from "zod";

// No createJobSchema — a Job is never created via a client request. It's
// created internally by booking.service.ts when a Booking transitions to
// ON_THE_WAY (see job.service.ts's createForBooking).

export const startJobSchema = z.object({
  // Optional override for the Manager-records-after-the-fact flow (§7's
  // note); defaults to "now" for the driver-logs-live-from-the-field flow.
  startTime: z.coerce.date().optional(),
});

export const pauseJobSchema = z.object({
  note: z.string().optional(),
});

export const resumeJobSchema = z.object({
  note: z.string().optional(),
});

export const completeJobSchema = z.object({
  endTime: z.coerce.date().optional(),
  // Manual override for the after-the-fact flow; auto-computed from
  // startTime/endTime/totalPausedDurationSec when omitted.
  actualHours: z.coerce.number().nonnegative().optional(),
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
  customerId: z.string().uuid(),
  villageId: z.string().uuid(),
  machineId: z.string().uuid(),
  driverId: z.string().uuid(),
  scheduledDate: z.coerce.date(),
  pricingMethodId: z.string().uuid(),
  rate: z.coerce.number().positive(),
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
export type ResumeJobInput = z.infer<typeof resumeJobSchema>;
export type CompleteJobInput = z.infer<typeof completeJobSchema>;
export type CancelJobInput = z.infer<typeof cancelJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type AddFuelEntryInput = z.infer<typeof addFuelEntrySchema>;
export type AddJobPhotoInput = z.infer<typeof addJobPhotoSchema>;
export type CreateManualJobInput = z.infer<typeof createManualJobSchema>;
