import { z } from "zod";

export const createVillageSchema = z.object({
  name: z.string().min(1),
});

export const updateVillageSchema = z.object({
  name: z.string().min(1),
});

export type CreateVillageInput = z.infer<typeof createVillageSchema>;
export type UpdateVillageInput = z.infer<typeof updateVillageSchema>;
