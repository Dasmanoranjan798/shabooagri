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
}

export interface UpdateTerminologyPayload {
  terms: { termKey: string; displayLabelSingular: string; displayLabelPlural: string }[];
}
