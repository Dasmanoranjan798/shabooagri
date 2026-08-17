import { z } from "zod";

export const createVillageSchema = z.object({
  name: z.string().min(1),
});

export const updateVillageSchema = z.object({
  name: z.string().min(1).optional(),
  // The Manager-facing alternative to delete (§ dependency-locked
  // deletion, Rule 5) — a Village referenced by any Booking can never be
  // hard-deleted, only marked inactive.
  isActive: z.boolean().optional(),
});

export type CreateVillageInput = z.infer<typeof createVillageSchema>;
export type UpdateVillageInput = z.infer<typeof updateVillageSchema>;
