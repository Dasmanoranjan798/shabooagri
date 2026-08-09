export interface Customer {
  id: string;
  companyId: string;
  name: string;
  villageId: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  userId: string | null;
  isGstApplicable?: boolean;
  gstin?: string | null;
  createdAt: string;
  updatedAt: string;
  village: {
    id: string;
    name: string;
  };
}

export interface CreateCustomerPayload {
  name: string;
  villageId: string;
  phone?: string;
  address?: string;
  notes?: string;
  userId?: string;
  isGstApplicable?: boolean;
  gstin?: string;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {}
