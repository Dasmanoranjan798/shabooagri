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
  mode: "LIVE" | "STUB";
}

export interface VerifyPaymentResponse {
  payment: { id: string; status: string };
  license: { id: string; status: string; expiryDate: string };
  provisioning: {
    company: { id: string; slug: string; name: string };
    ownerUser: { id: string; fullName: string; email: string };
    redirectUrl: string;
    alreadyProvisioned: boolean;
  };
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

  async createOrder(isInterState = false): Promise<OrderResponse> {
    const res = await request("/payments/orders", { method: "POST", body: JSON.stringify({ isInterState }) });
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
};
