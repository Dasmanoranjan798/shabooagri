import * as fuelRepository from "./fuel.repository";

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
) {
  return fuelRepository.create(companyId, jobId, machineId, litres, cost, recordedBy);
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
