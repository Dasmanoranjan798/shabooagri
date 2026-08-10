export interface SaasUser {
  id: string;
  email: string;
  phone?: string | null;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isPlatformAdmin: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  customerProfile?: SaasCustomerProfile | null;
  licenses?: SaasLicense[];
}

export interface SaasCustomerProfile {
  id: string;
  saasUserId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasLicense {
  id: string;
  licenseNumber: string;
  saasUserId: string;
  companyId?: string | null;
  paymentId?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  status:
    | "REGISTERED"
    | "PAYMENT_PENDING"
    | "PAYMENT_VERIFIED"
    | "LICENSE_ACTIVE"
    | "EXPIRING_SOON"
    | "EXPIRED"
    | "RENEWED";
  renewalCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasPayment {
  id: string;
  saasUserId: string;
  licenseId?: string | null;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  paymentReference?: string | null;
  baseAmount: number | string;
  gstAmount: number | string;
  totalAmount: number | string;
  cgstAmount?: number | string | null;
  sgstAmount?: number | string | null;
  igstAmount?: number | string | null;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  businessName?: string | null;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "UNREAD" | "IN_REVIEW" | "RESOLVED";
  createdAt: string;
}

export interface CustomerFeedback {
  id: string;
  saasUserId: string;
  companyId?: string | null;
  category: string;
  rating?: number | null;
  comment: string;
  status: "SUBMITTED" | "IN_REVIEW" | "PLANNED" | "RESOLVED" | "CLOSED";
  adminNotes?: string | null;
  createdAt: string;
}

export interface SaasAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SaasAuthResponse {
  tokens: SaasAuthTokens;
  user: {
    id: string;
    email: string;
    phone?: string | null;
    status: string;
    isPlatformAdmin: boolean;
  };
  customerProfile?: SaasCustomerProfile | null;
  license?: SaasLicense | null;
}

export interface RegisterSaasInput {
  email: string;
  password: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  businessType?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
}

export interface LoginSaasInput {
  email: string;
  password: string;
}

export interface SubmitEnquiryInput {
  name: string;
  businessName?: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export interface SubmitFeedbackInput {
  category: string;
  rating?: number;
  comment: string;
  companyId?: string;
}
