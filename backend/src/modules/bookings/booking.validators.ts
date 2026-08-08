import { z } from "zod";

export const bookingStatusSchema = z.enum(["PENDING", "ACCEPTED", "ON_THE_WAY", "WORKING", "COMPLETED", "CANCELLED"]);

// HH:mm or HH:mm:ss — stored as a Postgres TIME column (date part ignored),
// so we anchor it to a fixed epoch date before handing it to Prisma.
const timeOfDaySchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:mm or HH:mm:ss")
  .transform((value) => new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`));

// Machine and Driver are nullable at creation (§8.1 schema note) — a
// booking can be made before a machine/driver is decided, and assigned
// later via the dedicated assign-machine/assign-driver endpoints. They ARE
// still accepted here so a booking can be created fully-formed in one call
// when the caller already knows both.
export const createBookingSchema = z.object({
  customerId: z.string().uuid(),
  villageId: z.string().uuid(),
  location: z.string().optional(),
  machineId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  // Defaults to the authenticated creator if omitted — see booking.service.ts.
  managerId: z.string().uuid().optional(),
  scheduledDate: z.coerce.date(),
  scheduledTime: timeOfDaySchema.optional(),
  estimatedHours: z.coerce.number().nonnegative().optional(),
  estimatedAcres: z.coerce.number().nonnegative().optional(),
  pricingMethodId: z.string().uuid(),
  rate: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

// Deliberately excludes machineId/driverId (dedicated assign-machine /
// assign-driver endpoints, gated by machine.assign / driver.assign) and
// status (dedicated status-transition endpoint, which validates the
// transition graph rather than accepting an arbitrary status value here).
export const updateBookingSchema = createBookingSchema.omit({ machineId: true, driverId: true }).partial();

export const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
});

export const assignMachineSchema = z.object({
  machineId: z.string().uuid().nullable(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().uuid().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type AssignMachineInput = z.infer<typeof assignMachineSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
