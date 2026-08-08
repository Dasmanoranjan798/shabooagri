export type AvailabilityStatus = "AVAILABLE" | "ON_JOB" | "OFF_DUTY";

export interface EmployeeOption {
  id: string;
  companyId: string;
  name: string;
  phone?: string | null;
  designation?: string | null;
  isActive: boolean;
}

export interface Driver {
  id: string;
  companyId: string;
  employeeId: string;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  availabilityStatus: AvailabilityStatus;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeOption;
}

export interface CreateDriverPayload {
  employeeId: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  availabilityStatus?: AvailabilityStatus;
}

export interface UpdateDriverPayload extends Partial<CreateDriverPayload> {}
