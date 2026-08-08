import type { LoginResponse, User } from "../types/auth";
import type { DashboardSummaryResponse, IncomeSeriesResponse, FuelSeriesResponse, TimeRange } from "../types/dashboard";

const TOKEN_KEY = "shabooagri_token";
const REFRESH_TOKEN_KEY = "shabooagri_refresh_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
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
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // Handle 401 token refresh if refresh token exists
  if (response.status === 401) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken && url !== "/auth/refresh" && url !== "/auth/login") {
      try {
        const refreshRes = await fetch("/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setStoredTokens(data.accessToken, data.refreshToken);
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          response = await fetch(url, { ...options, headers });
        } else {
          clearStoredTokens();
        }
      } catch {
        clearStoredTokens();
      }
    }
  }

  return response;
}

export const api = {
  // Auth
  async login(identifier: string, password?: string, pin?: string): Promise<LoginResponse> {
    const body: Record<string, string> = { identifier };
    if (password) body.password = password;
    if (pin) body.pin = pin;

    const res = await fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new ApiError(res.status, err.message || "Invalid credentials");
    }

    const data: LoginResponse = await res.json();
    setStoredTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async me(): Promise<User> {
    const res = await fetchWithAuth("/auth/me");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Unauthorized" }));
      throw new ApiError(res.status, err.message || "Session expired");
    }
    const data = await res.json();
    return data.user;
  },

  async logout(): Promise<void> {
    clearStoredTokens();
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const res = await fetchWithAuth("/dashboard/summary");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch summary" }));
      throw new ApiError(res.status, err.message || "Failed to load dashboard summary");
    }
    return res.json();
  },

  async getIncomeSeries(range: TimeRange = "30d"): Promise<IncomeSeriesResponse> {
    const res = await fetchWithAuth(`/dashboard/income?range=${range}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch income series" }));
      throw new ApiError(res.status, err.message || "Failed to load income data");
    }
    return res.json();
  },

  async getFuelSeries(range: TimeRange = "30d"): Promise<FuelSeriesResponse> {
    const res = await fetchWithAuth(`/dashboard/fuel?range=${range}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch fuel series" }));
      throw new ApiError(res.status, err.message || "Failed to load fuel data");
    }
    return res.json();
  },
};
