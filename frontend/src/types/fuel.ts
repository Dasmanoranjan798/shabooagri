export interface FuelEntry {
  id: string;
  companyId: string;
  jobId: string;
  machineId: string;
  litres: number;
  cost?: number | null;
  recordedBy: string;
  recordedAt: string;
  machine?: {
    id: string;
    registrationNumber: string;
    brand?: string | null;
    model?: string | null;
  } | null;
  job?: { id: string } | null;
  recorder?: { id: string; fullName: string } | null;
}
