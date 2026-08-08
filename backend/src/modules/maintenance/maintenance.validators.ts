import { z } from "zod";

// ---- Maintenance Schedule validators ----

export const createScheduleSchema = z.object({
  machineId: z.string().uuid(),
  intervalHours: z.number().positive().optional().nullable(),
  intervalDays: z.number().int().positive().optional().nullable(),
  description: z.string().trim().min(1).max(500).optional().nullable(),
});

export const updateScheduleSchema = z.object({
  intervalHours: z.number().positive().optional().nullable(),
  intervalDays: z.number().int().positive().optional().nullable(),
  description: z.string().trim().min(1).max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ---- Maintenance Record validators ----

export const createRecordSchema = z.object({
  machineId: z.string().uuid(),
  maintenanceScheduleId: z.string().uuid().optional().nullable(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "serviceDate must be YYYY-MM-DD"),
  hourMeterAtService: z.number().nonnegative().optional().nullable(),
  description: z.string().trim().min(1).max(500).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  performedBy: z.string().trim().min(1).max(200).optional().nullable(),
});

export const updateRecordSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "serviceDate must be YYYY-MM-DD").optional(),
  hourMeterAtService: z.number().nonnegative().optional().nullable(),
  description: z.string().trim().min(1).max(500).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  performedBy: z.string().trim().min(1).max(200).optional().nullable(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
