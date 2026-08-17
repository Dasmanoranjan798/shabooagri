const TOKEN_KEY = "shabooagri_platform_token";
const REFRESH_TOKEN_KEY = "shabooagri_platform_refresh_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: fallbackMessage }));
    throw new ApiError(res.status, err.error || err.message || fallbackMessage);
  }
  return res.json();
}

export interface PlatformUser {
  id: string;
  email: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  isPlatformAdmin: boolean;
  companySlug: string | null;
}

export interface AuthResponse {
  user: PlatformUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
}

export interface OrderResponse {
  paymentId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  key: string | null;
  taxBreakdown: {
    totalAmount: number;
    baseAmount: number;
    gstAmount: number;
    isInterState: boolean;
    cgstAmount: number | null;
    sgstAmount: number | null;
    igstAmount: number | null;
  };
  plan: { key: string; name: string; machineLimit: number };
  intent: "signup" | "upgrade";
  mode: "LIVE" | "STUB";
}

export interface VerifyPaymentResponse {
  payment: { id: string; status: string };
  license: { id: string; status: string; expiryDate: string };
  provisioning: {
    company: { id: string; slug: string; name: string; planKey?: string | null; machineLimit?: number | null };
    ownerUser?: { id: string; fullName: string; email: string };
    redirectUrl: string | null;
    alreadyProvisioned?: boolean;
  };
}

export interface PricingPlan {
  key: string;
  name: string;
  machineLimit: number;
  priceAnnual: number;
}

export interface PublicConfig {
  plans: PricingPlan[];
  extraMachinePrice: number;
  announcement: { enabled: boolean; message: string | null };
  purchasingBlocked: boolean;
}

export const api = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    const data = await parseOrThrow<AuthResponse>(res, "Registration failed");
    setStoredTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    const data = await parseOrThrow<AuthResponse>(res, "Invalid credentials");
    setStoredTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async me(): Promise<PlatformUser> {
    const res = await request("/auth/me");
    return parseOrThrow<PlatformUser>(res, "Session expired");
  },

  logout(): void {
    clearStoredTokens();
  },

  async getPublicConfig(): Promise<PublicConfig> {
    const res = await request("/plans/config");
    return parseOrThrow<PublicConfig>(res, "Could not load pricing");
  },

  async createOrder(planKey: string, extraMachines = 0, isInterState = false): Promise<OrderResponse> {
    const res = await request("/payments/orders", {
      method: "POST",
      body: JSON.stringify({ planKey, extraMachines, isInterState }),
    });
    return parseOrThrow<OrderResponse>(res, "Failed to start checkout");
  },

  async verifyPayment(input: {
    paymentId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  }): Promise<VerifyPaymentResponse> {
    const res = await request("/payments/verify", { method: "POST", body: JSON.stringify(input) });
    return parseOrThrow<VerifyPaymentResponse>(res, "Payment verification failed");
  },

  async relaunch(): Promise<VerifyPaymentResponse["provisioning"]> {
    const res = await request("/provisioning/relaunch", { method: "POST" });
    return parseOrThrow<VerifyPaymentResponse["provisioning"]>(res, "Could not open your dashboard");
  },

  async getStatus(): Promise<{ companySlug: string | null; currentPlanKey: string | null }> {
    const res = await request("/provisioning/status");
    return parseOrThrow(res, "Could not load account status");
  },

  async getAdminDashboard(): Promise<AdminDashboardMetrics> {
    const res = await request("/admin/dashboard");
    return parseOrThrow<AdminDashboardMetrics>(res, "Could not load dashboard");
  },

  async getAdminPlans(): Promise<AdminPricingPlan[]> {
    const res = await request("/admin/plans");
    return parseOrThrow<AdminPricingPlan[]>(res, "Could not load plans");
  },

  async updateAdminPlan(
    key: string,
    data: Partial<Pick<AdminPricingPlan, "name" | "machineLimit" | "priceAnnual" | "isActive">>,
  ): Promise<AdminPricingPlan> {
    const res = await request(`/admin/plans/${key}`, { method: "PATCH", body: JSON.stringify(data) });
    return parseOrThrow<AdminPricingPlan>(res, "Could not update plan");
  },

  async getAdminSiteSettings(): Promise<AdminSiteSettings> {
    const res = await request("/admin/site-settings");
    return parseOrThrow<AdminSiteSettings>(res, "Could not load site settings");
  },

  async updateAdminSiteSettings(data: Partial<AdminSiteSettings>): Promise<AdminSiteSettings> {
    const res = await request("/admin/site-settings", { method: "PATCH", body: JSON.stringify(data) });
    return parseOrThrow<AdminSiteSettings>(res, "Could not update site settings");
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const res = await request("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
    return parseOrThrow(res, "Failed to send reset link");
  },

  async verifyPasswordResetToken(email: string, token: string): Promise<{ valid: boolean }> {
    const res = await request("/auth/password-reset/verify-token", {
      method: "POST",
      body: JSON.stringify({ email, token }),
    });
    return parseOrThrow(res, "Invalid or expired token");
  },

  async confirmPasswordReset(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    const res = await request("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ email, token, newPassword }),
    });
    return parseOrThrow(res, "Failed to reset password");
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return parseOrThrow(res, "Failed to change password");
  },

  async submitFeedback(input: { name: string; email: string; message: string }): Promise<{ message: string }> {
    const res = await request("/api/contact/feedback", { method: "POST", body: JSON.stringify(input) });
    return parseOrThrow(res, "Failed to submit feedback");
  },

  async submitSupportRequest(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<{ message: string }> {
    const res = await request("/api/contact/support", { method: "POST", body: JSON.stringify(input) });
    return parseOrThrow(res, "Failed to submit your request");
  },

  async getAdminFeedback(): Promise<AdminFeedbackItem[]> {
    const res = await request("/admin/feedback");
    return parseOrThrow<AdminFeedbackItem[]>(res, "Could not load feedback");
  },

  async getAdminSupportRequests(): Promise<AdminSupportRequestItem[]> {
    const res = await request("/admin/support-requests");
    return parseOrThrow<AdminSupportRequestItem[]>(res, "Could not load support requests");
  },

  async updateAdminSupportRequest(id: string, status: "OPEN" | "RESOLVED"): Promise<AdminSupportRequestItem> {
    const res = await request(`/admin/support-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    return parseOrThrow<AdminSupportRequestItem>(res, "Could not update support request");
  },

  // Customer drill-down (read-only) — from the Total Signups / Purchases
  // dashboard tiles.
  async getAdminPlatformUsers(): Promise<AdminPlatformUserListItem[]> {
    const res = await request("/admin/platform-users");
    return parseOrThrow<AdminPlatformUserListItem[]>(res, "Could not load customers");
  },

  async getAdminPlatformUserDetail(id: string): Promise<AdminPlatformUserDetail> {
    const res = await request(`/admin/platform-users/${id}`);
    return parseOrThrow<AdminPlatformUserDetail>(res, "Could not load customer detail");
  },
};

export interface AdminDashboardMetrics {
  totalSignups: number;
  purchases: { count: number; totalRevenue: number };
  licensesExpiringSoon: number;
  feedbackCount: number;
  supportRequestCount: number;
}

export interface AdminPricingPlan {
  key: string;
  name: string;
  machineLimit: number;
  priceAnnual: number;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminSiteSettings {
  announcementEnabled: boolean;
  announcementMessage: string | null;
  purchasingBlocked: boolean;
  extraMachinePrice: number;
}

export interface AdminFeedbackItem {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface AdminSupportRequestItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export type LicenseStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export interface AdminPlatformUserPlanSummary {
  key: string;
  name: string;
  machineLimit: number;
}

export interface AdminPlatformUserListItem {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  createdAt: string;
  currentPlan: AdminPlatformUserPlanSummary | null;
  licenseStatus: LicenseStatus | null;
  licenseExpiryDate: string | null;
}

export interface AdminPlatformUserHistoryEntry {
  paymentId: string;
  planKey: string;
  planName: string;
  intent: string;
  amount: number;
  currency: string;
  status: string;
  gatewayPaymentId: string | null;
  createdAt: string;
  license: {
    startDate: string | null;
    expiryDate: string | null;
    status: LicenseStatus;
    renewalCount: number;
  } | null;
}

export interface AdminPlatformUserDetail {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  companySlug: string | null;
  createdAt: string;
  currentPlan: AdminPlatformUserPlanSummary | null;
  currentLicense: {
    status: LicenseStatus;
    startDate: string | null;
    expiryDate: string | null;
    renewalCount: number;
  } | null;
  history: AdminPlatformUserHistoryEntry[];
  feedback: AdminFeedbackItem[];
  supportRequests: AdminSupportRequestItem[];
}
