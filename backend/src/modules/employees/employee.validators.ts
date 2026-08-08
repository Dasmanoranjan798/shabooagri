import { z } from "zod";

const employmentStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  roleTitle: z.string().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  joinedDate: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
