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
