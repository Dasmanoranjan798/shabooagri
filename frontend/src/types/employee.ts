export type EmploymentStatus = "ACTIVE" | "INACTIVE";

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  roleTitle: string | null;
  employmentStatus: EmploymentStatus;
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
  joinedDate?: string;
  userId?: string;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {}
