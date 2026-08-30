import { z } from "zod";

export const createVillageSchema = z.object({
  // Client-authoritative identity (offline-first): a device that creates a
  // record offline generates its own UUID so the record has a stable, globally
  // unique id BEFORE it ever reaches the server. On sync the backend honours
  // that id (idempotency dedupes any replay), so relationships formed offline
  // — e.g. a booking created for a just-created village — stay intact. Optional
  // and UUID-validated; omitted by the web app, which lets the DB generate it.
  id: z.string().uuid().optional(),
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
