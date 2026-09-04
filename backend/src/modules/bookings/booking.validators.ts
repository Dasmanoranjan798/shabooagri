import { z } from "zod";

// HH:mm or HH:mm:ss — stored as a Postgres TIME column (date part ignored),
// so we anchor it to a fixed epoch date before handing it to Prisma.
const timeOfDaySchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:mm or HH:mm:ss")
  .transform((value) => new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`));

// Machine and Driver are nullable at creation — a booking is saved with
// just Farmer/Village/Work description, machine/driver decided later via
// the dedicated assign-machine/assign-driver endpoints (or up front here,
// if the caller already knows both). Saving a booking always creates its
// Job Card immediately (see booking.service.ts's create()) — the card
// shows "Ready to Start" once machine+driver are set, "Awaiting Machine"
// until then.
//
// pricingMethodId/rate are likewise optional here: the job-card flow picks
// pricing on the Live Job screen right before Start (dedicated
// assign-pricing endpoint below), not at booking time.
export const createBookingSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  // Optional transaction-specific work location. The client defaults it to the
  // customer's registered address; only set explicitly when the job is somewhere
  // other than where the farmer lives. The old villageId master ref was removed.
  location: z.string().optional(),
  machineId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  // Defaults to the authenticated creator if omitted — see booking.service.ts.
  managerId: z.string().uuid().optional(),
  scheduledDate: z.coerce.date(),
  scheduledTime: timeOfDaySchema.optional(),
  estimatedHours: z.coerce.number().nonnegative().optional(),
  estimatedAcres: z.coerce.number().nonnegative().optional(),
  workDescription: z.string().trim().min(1, "Work needed is required"),
  pricingMethodId: z.string().uuid().optional(),
  rate: z.coerce.number().nonnegative().optional(),
  // Optional minimum billable floor (§8.2). Applied as max(metered, minimum).
  minimumCharge: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  ignoreConflict: z.boolean().optional(),
});

// Deliberately excludes machineId/driverId (dedicated assign-machine /
// assign-driver endpoints, gated by machine.assign / driver.assign) and
// pricingMethodId/rate (dedicated assign-pricing endpoint below, gated by
// job.update_status since it's part of the Live Job screen's pre-Start
// step, not a booking-edit action).
export const updateBookingSchema = createBookingSchema
  .omit({ machineId: true, driverId: true, pricingMethodId: true, rate: true, minimumCharge: true })
  .partial();

export const assignMachineSchema = z.object({
  machineId: z.string().uuid().nullable(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().uuid().nullable(),
});

export const assignPricingSchema = z.object({
  pricingMethodId: z.string().uuid(),
  rate: z.coerce.number().nonnegative(),
  // Optional minimum billable floor (§8.2). Null/omitted clears any prior floor.
  minimumCharge: z.coerce.number().nonnegative().nullable().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type AssignMachineInput = z.infer<typeof assignMachineSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type AssignPricingInput = z.infer<typeof assignPricingSchema>;
