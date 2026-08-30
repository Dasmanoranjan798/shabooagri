import { z } from "zod";

const availabilityStatusSchema = z.enum(["AVAILABLE", "ON_JOB", "OFF_DUTY"]);

export const createDriverSchema = z.object({
  // Client-authoritative offline id (see villages validator); optional + UUID.
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  licenseNumber: z.string().optional(),
  licenseExpiryDate: z.coerce.date().optional(),
  availabilityStatus: availabilityStatusSchema.optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
