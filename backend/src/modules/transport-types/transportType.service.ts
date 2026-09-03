import { AppError } from "../../shared/errors/AppError";
import * as transportTypeRepository from "./transportType.repository";

// Sensible defaults every company starts with (Part 17). Configurable — new
// ones are inserts via create(), not code changes. Kept here (not a DB seed)
// so existing companies get them lazily on first use without a backfill.
export const DEFAULT_TRANSPORT_TYPES = ["Tractor", "Tipper", "Pickup", "Trailer", "Truck"];

// Idempotently ensures a company has its default transport types. Called on
// list and before recording a charge so any company (including ones created
// before this feature) always has a usable, configurable set.
export async function ensureDefaults(companyId: string) {
  const existing = await transportTypeRepository.count(companyId);
  if (existing > 0) return;
  for (const name of DEFAULT_TRANSPORT_TYPES) {
    // Race-safe enough for a rarely-hit bootstrap: a duplicate just no-ops.
    try {
      await transportTypeRepository.create(companyId, name);
    } catch {
      /* unique (companyId,name) — already created concurrently */
    }
  }
}

export async function list(companyId: string) {
  await ensureDefaults(companyId);
  return transportTypeRepository.findAllForCompany(companyId);
}

export async function create(companyId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new AppError(400, "Transport type name is required");
  const existing = await transportTypeRepository.findByNameScoped(companyId, trimmed);
  if (existing) throw new AppError(409, "A transport type with this name already exists");
  return transportTypeRepository.create(companyId, trimmed);
}

export async function getById(companyId: string, id: string) {
  const type = await transportTypeRepository.findByIdScoped(companyId, id);
  if (!type) throw new AppError(404, "Transport type not found");
  return type;
}
