export type JobStatus = "NOT_STARTED" | "WORKING" | "PAUSED" | "STOPPED" | "COMPLETED" | "CANCELLED";
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
  // Nullable — a Job Card is created the instant a Booking is saved, often
  // before a machine/driver is decided. See isReadyToStart below for the
  // "Ready to Start" / "Awaiting Machine" card badge this drives.
  machineId: string | null;
  driverId: string | null;
  status: JobStatus;
  // Computed server-side (job.service.ts's withReadiness) from
  // machineId/driverId only — deliberately NOT from pricing, since pricing
  // is picked on the Live Job screen itself, after a card is tapped.
  isReadyToStart?: boolean;
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
    workDescription: string | null;
    // Null until assigned on the Live Job screen right before Start.
    rate: number | null;
    pricingMethod: { id: string; key: string; label: string; unit: string | null } | null;
    location?: string | null;
    customer?: { id: string; name: string; village?: { id: string; name: string } };
    village?: { id: string; name: string };
  };
  machine: {
    id: string;
    registrationNumber: string;
    brand: string | null;
    model: string | null;
  } | null;
  driver: {
    id: string;
    employee: { id: string; name: string };
  } | null;
  fuelEntries?: JobFuelEntry[];
  photos?: JobPhoto[];
}

export interface StopJobPayload {
  endTime?: string;
  actualHours?: number;
}

export interface SubmitJobPayload {
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
