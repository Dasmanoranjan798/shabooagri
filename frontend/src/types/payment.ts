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
  bookingId: string;
  customerId: string;
  invoiceNumber: string;
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

export interface ReceiptData {
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
  invoice: Invoice;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    village?: string | null;
    isGstApplicable?: boolean;
    gstin?: string | null;
  };
}
