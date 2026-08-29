import type { Prisma } from "@prisma/client";
import * as fuelRepository from "./fuel.repository";

// Company-wide fuel entry listing — used by GET /fuel/entries route.
// Filters (machineId, jobId, date range) are all optional.
export function listAll(
  companyId: string,
  filter: { machineId?: string; jobId?: string; fromDate?: string; toDate?: string } = {},
) {
  return fuelRepository.findAllForCompany(companyId, filter);
}


// No cross-module validation here: the caller (job.service.ts) already
// knows machineId is valid because it's the job's own machineId, not a
// value the client supplies directly — see job.service.ts's addFuelEntry.
export function addEntry(
  companyId: string,
  jobId: string,
  machineId: string,
  recordedBy: string,
  litres: number,
  cost: number | undefined,
  tx?: Prisma.TransactionClient,
) {
  return fuelRepository.create(companyId, jobId, machineId, litres, cost, recordedBy, tx);
}

export function listForJob(companyId: string, jobId: string) {
  return fuelRepository.findAllForJob(companyId, jobId);
}

export function sumLitresForJob(companyId: string, jobId: string) {
  return fuelRepository.sumLitresForJob(companyId, jobId);
}

// Returns daily fuel totals within a UTC date window. Used by the Dashboard
// fuel-consumption chart. Dashboard passes UTC boundaries for the company's
// timezone-corrected period so the date bucketing is correct per company
// timezone. The Fuel module doesn't itself interpret timezone — that concern
// belongs to the Dashboard service.
export function getLitresByDay(companyId: string, fromUtc: Date, toUtc: Date) {
  return fuelRepository.getLitresByDay(companyId, fromUtc, toUtc);
}
