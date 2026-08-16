export interface MaintenanceSchedule {
  id: string;
  companyId: string;
  machineId: string;
  intervalHours?: number | null;
  intervalDays?: number | null;
  description?: string | null;
  isActive: boolean;
  machine?: {
    id: string;
    registrationNumber: string;
    brand?: string | null;
    model?: string | null;
  } | null;
  records?: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  companyId: string;
  machineId: string;
  maintenanceScheduleId?: string | null;
  serviceDate: string;
  hourMeterAtService?: number | null;
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
  createdAt: string;
  machine?: {
    id: string;
    registrationNumber: string;
    brand?: string | null;
    model?: string | null;
  } | null;
  schedule?: { id: string; description?: string | null } | null;
}

export interface CreateMaintenanceRecordPayload {
  machineId: string;
  maintenanceScheduleId?: string;
  serviceDate: string;
  hourMeterAtService?: number;
  description?: string;
  cost?: number;
  performedBy?: string;
}

export interface CreateMaintenanceSchedulePayload {
  machineId: string;
  intervalHours?: number;
  intervalDays?: number;
  description?: string;
}

export interface MaintenanceAlert {
  id: string;
  machineId: string;
  machineRegistration: string;
  machineBrandModel: string;
  description: string;
  intervalHours: number | null;
  intervalDays: number | null;
  currentWorkedHours: number;
  hoursSinceLastService: number;
  daysSinceLastService: number;
  lastServiceDate: string | null;
  status: "OVERDUE" | "DUE_SOON" | "HEALTHY";
  reason: string;
}
