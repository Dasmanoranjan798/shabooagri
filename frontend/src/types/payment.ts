export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CREDIT";

export interface PaymentRecord {
  id: string;
  companyId: string;
  invoiceId: string;
  receivedByUserId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  receiver?: {
    id: string;
    fullName: string;
    email?: string | null;
    mobileNumber?: string | null;
  } | null;
}

export interface Invoice {
  id: string;
  companyId: string;
  bookingId: string | null;
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  isGstApplicable?: boolean;
  taxRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  dueDate?: string | null;
  notes?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    village?: { id: string; name: string } | null;
    isGstApplicable?: boolean;
    gstin?: string | null;
  } | null;
  booking?: {
    id: string;
    bookingNumber: string;
    machine?: { id: string; registrationNumber: string; brand?: string | null } | null;
    driver?: { id: string; employee?: { id: string; name: string } | null } | null;
    pricingMethod?: { id: string; name: string; unit?: string | null } | null;
  } | null;
  payments?: PaymentRecord[];
}

export interface ReceivePaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface CreateManualInvoicePayload {
  customerId: string;
  totalAmount: number;
  description: string;
  dueDate?: string;
}

export interface CustomerAdvance {
  id: string;
  companyId: string;
  customerId: string;
  amount: number;
  appliedAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedAt: string;
  notes?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    village?: { id: string; name: string } | null;
  } | null;
  receiver?: {
    id: string;
    fullName: string;
  } | null;
}

export interface RecordCustomerAdvancePayload {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface ReceiptInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  subtotalAmount: number;
  taxRate?: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  isGstApplicable?: boolean;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
}

export interface ReceiptPayment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedAt: string;
  receivedBy: string;
  notes?: string | null;
}

export interface ReceiptData {
  receiptNumber: string;
  title: string;
  generatedAt: string;
  company: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
    isGstRegistered?: boolean;
    gstin?: string | null;
    pan?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    upiId?: string | null;
  };
  invoice: ReceiptInvoice;
  description?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    village?: string | null;
    isGstApplicable?: boolean;
    gstin?: string | null;
  };
  service: {
    bookingNumber: string | null;
    scheduledDate: string;
    location?: string | null;
    machine: { registrationNumber: string; brand?: string | null; model?: string | null } | null;
    driver: { name: string } | null;
    pricingMethod: string;
    rate: number;
    actualHours: number | null;
    completedAcres: number | null;
    fuelUsedLitres: number | null;
  };
  payments: ReceiptPayment[];
}
