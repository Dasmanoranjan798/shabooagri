export interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  themeColor?: string | null;
  accentColor?: string | null;
  currency: string;
  timezone: string;
  language: string;
  invoicePrefix?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  isGstRegistered?: boolean;
  gstin?: string | null;
  pan?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  defaultTaxRate?: number | null;
  taxInclusive?: boolean;
  serviceAlertHours?: number;
  insuranceAlertDays?: number;
  licenseAlertDays?: number;
  requireJobPhoto?: boolean;
  requireJobFuelLog?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  terminologySettings: TerminologySetting[];
}

export interface TerminologySetting {
  id: string;
  termKey: string;
  displayLabelSingular: string;
  displayLabelPlural: string;
}

export interface UpdateCompanyProfilePayload {
  name?: string;
  logoUrl?: string | null;
  themeColor?: string | null;
  accentColor?: string | null;
  currency?: string;
  timezone?: string;
  language?: string;
  invoicePrefix?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  isGstRegistered?: boolean;
  gstin?: string | null;
  pan?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  defaultTaxRate?: number | null;
  taxInclusive?: boolean;
  serviceAlertHours?: number;
  insuranceAlertDays?: number;
  licenseAlertDays?: number;
  requireJobPhoto?: boolean;
  requireJobFuelLog?: boolean;
}

export interface UpdateTerminologyPayload {
  terms: { termKey: string; displayLabelSingular: string; displayLabelPlural: string }[];
}
