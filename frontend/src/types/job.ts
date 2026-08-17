export type JobStatus = "NOT_STARTED" | "WORKING" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type JobExecutionMode = "LIVE" | "MANUAL";

export interface JobFuelEntry {
  id: string;
  jobId: string;
  litres: number;
  cost: number | null;
  recordedBy: string;
  recordedAt: string;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  fileUrl: string;
  caption: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  bookingId: string;
  machineId: string;
  driverId: string;
  status: JobStatus;
  executionMode?: JobExecutionMode;
  startTime: string | null;
  endTime: string | null;
  totalPausedDurationSec: number;
  actualHours: number | null;
  completedAcres: number | null;
  fuelUsedLitres: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    customerId: string;
    villageId: string;
    scheduledDate: string;
    scheduledTime: string | null;
    rate: number;
    pricingMethod: { id: string; key: string; label: string; unit: string | null };
    location?: string | null;
    customer?: { id: string; name: string; village?: { id: string; name: string } };
    village?: { id: string; name: string };
  };
  machine: {
    id: string;
    registrationNumber: string;
    brand: string | null;
    model: string | null;
  };
  driver: {
    id: string;
    employee: { id: string; name: string };
  };
  fuelEntries?: JobFuelEntry[];
  photos?: JobPhoto[];
}

export interface CompleteJobPayload {
  endTime?: string;
  actualHours?: number;
  completedAcres?: number;
  notes?: string;
}

export interface UpdateJobPayload {
  completedAcres?: number;
  actualHours?: number;
  notes?: string;
}

export interface CreateManualJobPayload {
  customerId: string;
  villageId: string;
  machineId: string;
  driverId: string;
  scheduledDate: string;
  pricingMethodId: string;
  rate: number;
  startTime: string;
  endTime: string;
  actualHours?: number;
  completedAcres?: number;
  fuelUsedLitres?: number;
  notes?: string;
  location?: string;
}
