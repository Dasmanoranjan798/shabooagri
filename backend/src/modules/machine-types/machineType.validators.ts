import { z } from "zod";

export const createMachineTypeSchema = z.object({
  name: z.string().min(1),
});

export const updateMachineTypeSchema = z.object({
  name: z.string().min(1),
});

export type CreateMachineTypeInput = z.infer<typeof createMachineTypeSchema>;
export type UpdateMachineTypeInput = z.infer<typeof updateMachineTypeSchema>;
