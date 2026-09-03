import { AppError } from "../../shared/errors/AppError";
import * as pauseReasonRepository from "./pauseReason.repository";

// Sensible defaults every company starts with. Kept here (not a DB seed) so
// existing companies get them lazily on first use without a backfill — same
// pattern as the transport-type master.
export const DEFAULT_PAUSE_REASONS = [
  "Breakdown / repair",
  "Refuelling",
  "Meal / rest break",
  "Weather",
  "Waiting for customer",
  "Field / access problem",
  "Shift change",
];

async function ensureDefaults(companyId: string) {
  const existing = await pauseReasonRepository.count(companyId);
  if (existing > 0) return;
  for (const label of DEFAULT_PAUSE_REASONS) {
    try {
      await pauseReasonRepository.create(companyId, label);
    } catch {
      /* unique (companyId,label) — created concurrently, ignore */
    }
  }
}

export async function list(companyId: string) {
  await ensureDefaults(companyId);
  return pauseReasonRepository.findAllForCompany(companyId);
}

export async function create(companyId: string, label: string, createdBy?: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new AppError(400, "A reason is required");
  // Backend duplicate check (case-insensitive), not just a client-side guard.
  const existing = await pauseReasonRepository.findByLabelInsensitive(companyId, trimmed);
  if (existing) throw new AppError(409, "This reason already exists");
  try {
    return await pauseReasonRepository.create(companyId, trimmed, createdBy);
  } catch (err: any) {
    // Race backstop: the DB unique index caught a concurrent create.
    if (err?.code === "P2002") throw new AppError(409, "This reason already exists");
    throw err;
  }
}
