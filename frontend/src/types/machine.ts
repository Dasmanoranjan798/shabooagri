export type FuelType = "DIESEL" | "PETROL" | "ELECTRIC" | "OTHER";
export type MachineStatus = "WORKING" | "AVAILABLE" | "REPAIR" | "OFFLINE";

export interface MachineType {
  id: string;
  companyId: string;
  name: string;
  category?: string | null;
  description?: string | null;
}

export interface Machine {
  id: string;
  companyId: string;
  machineTypeId: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
  purchaseYear: number | null;
  fuelType: FuelType;
  status: MachineStatus;
  hourMeterReading: number;
  insuranceNumber: string | null;
  insuranceExpiryDate: string | null;
  assignedDriverId: string | null;
  nextServiceDueHours: number | null;
  lastServiceDate: string | null;
  lastServiceHourMeter: number | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  machineType?: MachineType;
  assignedDriver?: {
    id: string;
    employee?: { id: string; name: string };
  } | null;
}

export interface CreateMachinePayload {
  machineTypeId: string;
  registrationNumber: string;
  brand?: string;
  model?: string;
  purchaseYear?: number;
  fuelType?: FuelType;
  status?: MachineStatus;
  hourMeterReading?: number;
  insuranceNumber?: string;
  insuranceExpiryDate?: string;
  assignedDriverId?: string;
  nextServiceDueHours?: number;
  lastServiceDate?: string;
  lastServiceHourMeter?: number;
  photoUrl?: string;
  isActive?: boolean;
}

export interface UpdateMachinePayload extends Partial<CreateMachinePayload> {}
