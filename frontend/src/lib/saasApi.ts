import type {
  ContactEnquiry,
  CustomerFeedback,
  LoginSaasInput,
  RegisterSaasInput,
  SaasAuthResponse,
  SaasCustomerProfile,
  SaasLicense,
  SaasPayment,
  SaasUser,
  SubmitEnquiryInput,
  SubmitFeedbackInput,
} from "../types/saas";

const SAAS_TOKEN_KEY = "shabooagri_saas_token";
const SAAS_REFRESH_TOKEN_KEY = "shabooagri_saas_refresh_token";

export function getStoredSaasToken(): string | null {
  return localStorage.getItem(SAAS_TOKEN_KEY);
}

export function setStoredSaasTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(SAAS_TOKEN_KEY, accessToken);
  localStorage.setItem(SAAS_REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredSaasTokens(): void {
  localStorage.removeItem(SAAS_TOKEN_KEY);
  localStorage.removeItem(SAAS_REFRESH_TOKEN_KEY);
}

export function isTenantSubdomain(): boolean {
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  if (params.get("tenant")) return true;

  if (!host || host === "localhost" || host === "127.0.0.1" || host === "shabooagri.com" || host === "www.shabooagri.com") {
    return false;
  }
  return host.endsWith(".shabooagri.com");
}

export function getTenantSlugFromHost(): string | null {
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  if (params.get("tenant")) return params.get("tenant");
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "shabooagri.com" || host === "www.shabooagri.com") {
    return null;
  }
  const parts = host.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

export class SaasApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "SaasApiError";
  }
}

async function fetchSaasApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredSaasToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, { ...options, headers });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = json?.error || json?.message || `Request failed with status ${response.status}`;
    throw new SaasApiError(response.status, errorMsg);
  }

  return json?.data ?? json;
}

export async function saasRegister(input: RegisterSaasInput): Promise<SaasAuthResponse> {
  const res = await fetchSaasApi<SaasAuthResponse>("/saas/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (res.tokens) {
    setStoredSaasTokens(res.tokens.accessToken, res.tokens.refreshToken);
  }
  return res;
}

export async function saasLogin(input: LoginSaasInput): Promise<SaasAuthResponse> {
  const res = await fetchSaasApi<SaasAuthResponse>("/saas/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (res.tokens) {
    setStoredSaasTokens(res.tokens.accessToken, res.tokens.refreshToken);
  }
  return res;
}

export async function getSaasMe(): Promise<SaasUser> {
  return fetchSaasApi<SaasUser>("/saas/auth/me");
}

export async function changeSaasPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return fetchSaasApi<{ message: string }>("/saas/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getSaasCustomerProfile(): Promise<SaasCustomerProfile> {
  return fetchSaasApi<SaasCustomerProfile>("/saas/customers/profile");
}

export async function getSaasMyLicenses(): Promise<SaasLicense[]> {
  return fetchSaasApi<SaasLicense[]>("/saas/licenses/my-license");
}

export async function getSaasMyPayments(): Promise<SaasPayment[]> {
  return fetchSaasApi<SaasPayment[]>("/saas/payments/my-payments");
}

export async function submitContactEnquiry(input: SubmitEnquiryInput): Promise<ContactEnquiry> {
  return fetchSaasApi<ContactEnquiry>("/saas/enquiries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function submitSaasFeedback(input: SubmitFeedbackInput): Promise<CustomerFeedback> {
  return fetchSaasApi<CustomerFeedback>("/saas/feedback", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getSaasMyFeedback(): Promise<CustomerFeedback[]> {
  return fetchSaasApi<CustomerFeedback[]>("/saas/feedback/my-feedback");
}

// ==================== S3 COMMERCIAL ACTIVATION & PAYMENT API ====================

export async function createSaasPaymentOrder(input?: { isInterState?: boolean; notes?: string }) {
  return fetchSaasApi<{
    paymentId: string;
    gatewayOrderId: string;
    amount: number;
    currency: string;
    key: string;
    taxBreakdown: {
      baseAmount: number;
      gstAmount: number;
      totalAmount: number;
      cgstAmount?: number;
      sgstAmount?: number;
      igstAmount?: number;
    };
    environment: string;
  }>("/saas/payments/create-order", {
    method: "POST",
    body: JSON.stringify(input || {}),
  });
}

export async function verifySaasPayment(input: {
  paymentId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}) {
  return fetchSaasApi<{
    success: boolean;
    status: string;
    paymentId: string;
    licenseNumber?: string;
    tenantSlug: string;
    softwareUrl: string;
    alreadyProcessed?: boolean;
  }>("/saas/payments/verify-payment", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==================== S3 SINGLE SIGN-ON (SSO) LAUNCH API ====================

export async function getSsoLaunchToken() {
  return fetchSaasApi<{
    ssoToken: string;
    tenantSlug: string;
    softwareUrl: string;
    companyName: string;
  }>("/saas/auth/sso-token", {
    method: "POST",
  });
}

export async function exchangeSsoToken(token: string) {
  return fetchSaasApi<{
    tokens: { accessToken: string; refreshToken: string };
    user: any;
    company: { id: string; name: string; slug: string };
  }>("/saas/auth/sso-exchange", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ==================== S3 PLATFORM ADMIN CONTROL PLANE API ====================

export async function getAdminDashboardMetrics() {
  return fetchSaasApi<{
    totalUsers: number;
    totalProfiles: number;
    activeLicenses: number;
    pendingPayments: number;
    expiringLicenses: number;
    expiredLicenses: number;
    totalRevenue: number;
    totalLeads: number;
    unreadEnquiries: number;
    pendingFeedback: number;
  }>("/saas/admin/dashboard");
}

export async function getAdminCustomers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetchSaasApi<any[]>(`/saas/admin/customers${query}`);
}

export async function getAdminLicenses(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchSaasApi<any[]>(`/saas/admin/licenses${query}`);
}

export async function extendAdminLicense(input: {
  licenseId: string;
  extensionDays: number;
  reason: string;
}) {
  return fetchSaasApi<any>("/saas/admin/licenses/extend", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getAdminPayments(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchSaasApi<any[]>(`/saas/admin/payments${query}`);
}

export async function getAdminLeads() {
  return fetchSaasApi<any[]>("/saas/admin/leads");
}

export async function updateAdminLeadStatus(id: string, status: string, followUpNotes?: string) {
  return fetchSaasApi<any>(`/saas/admin/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, followUpNotes }),
  });
}

export async function getAdminEnquiries() {
  return fetchSaasApi<any[]>("/saas/admin/enquiries");
}

export async function updateAdminEnquiryStatus(id: string, status: string, responseNotes?: string) {
  return fetchSaasApi<any>(`/saas/admin/enquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, responseNotes }),
  });
}

export async function getAdminFeedback() {
  return fetchSaasApi<any[]>("/saas/admin/feedback");
}

export async function updateAdminFeedbackStatus(id: string, status: string, adminNotes?: string) {
  return fetchSaasApi<any>(`/saas/admin/feedback/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, adminNotes }),
  });
}
