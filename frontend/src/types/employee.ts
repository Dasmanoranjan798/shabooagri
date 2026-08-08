export type EmploymentStatus = "ACTIVE" | "INACTIVE";
export type CompensationType = "HOURLY" | "MONTHLY" | "YEARLY";

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  roleTitle: string | null;
  employmentStatus: EmploymentStatus;
  compensationType?: CompensationType;
  hourlyRate?: number | null;
  monthlySalary?: number | null;
  yearlySalary?: number | null;
  joinedDate: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  name: string;
  phone?: string;
  roleTitle?: string;
  employmentStatus?: EmploymentStatus;
  compensationType?: CompensationType;
  hourlyRate?: number;
  monthlySalary?: number;
  yearlySalary?: number;
  joinedDate?: string;
  userId?: string;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {}
