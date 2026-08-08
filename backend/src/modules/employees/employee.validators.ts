import { z } from "zod";

const employmentStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const compensationTypeSchema = z.enum(["HOURLY", "MONTHLY", "YEARLY"]);

export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  roleTitle: z.string().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  compensationType: compensationTypeSchema.optional(),
  hourlyRate: z.coerce.number().min(0).optional().nullable(),
  monthlySalary: z.coerce.number().min(0).optional().nullable(),
  yearlySalary: z.coerce.number().min(0).optional().nullable(),
  joinedDate: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
