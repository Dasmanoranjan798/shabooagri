import type { LoginResponse, User } from "../types/auth";
import type { DashboardSummaryResponse, IncomeSeriesResponse, FuelSeriesResponse, TimeRange } from "../types/dashboard";
import type {
  Booking,
  BookingAttachment,
  BookingStatus,
  CreateBookingPayload,
  CustomerOption,
  DriverOption,
  MachineOption,
  PricingMethodOption,
  UpdateBookingPayload,
  VillageOption,
} from "../types/booking";

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

  // Bookings
  async listBookings(): Promise<Booking[]> {
    const res = await fetchWithAuth("/bookings");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch bookings" }));
      throw new ApiError(res.status, err.message || "Failed to load bookings");
    }
    return res.json();
  },

  async getBookingById(id: string): Promise<Booking> {
    const res = await fetchWithAuth(`/bookings/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Booking not found" }));
      throw new ApiError(res.status, err.message || "Booking not found");
    }
    return res.json();
  },

  async createBooking(data: CreateBookingPayload): Promise<Booking> {
    const res = await fetchWithAuth("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create booking" }));
      throw new ApiError(res.status, err.message || "Failed to create booking");
    }
    return res.json();
  },

  async updateBookingDetails(id: string, data: UpdateBookingPayload): Promise<Booking> {
    const res = await fetchWithAuth(`/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update booking" }));
      throw new ApiError(res.status, err.message || "Failed to update booking");
    }
    return res.json();
  },

  async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    const res = await fetchWithAuth(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Invalid status transition" }));
      throw new ApiError(res.status, err.message || "Failed to update status");
    }
    return res.json();
  },

  async assignBookingMachine(id: string, machineId: string | null): Promise<Booking> {
    const res = await fetchWithAuth(`/bookings/${id}/machine`, {
      method: "PATCH",
      body: JSON.stringify({ machineId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to assign machine" }));
      throw new ApiError(res.status, err.message || "Failed to assign machine");
    }
    return res.json();
  },

  async assignBookingDriver(id: string, driverId: string | null): Promise<Booking> {
    const res = await fetchWithAuth(`/bookings/${id}/driver`, {
      method: "PATCH",
      body: JSON.stringify({ driverId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to assign driver" }));
      throw new ApiError(res.status, err.message || "Failed to assign driver");
    }
    return res.json();
  },

  async deleteBooking(id: string): Promise<void> {
    const res = await fetchWithAuth(`/bookings/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete booking" }));
      throw new ApiError(res.status, err.message || "Failed to delete booking");
    }
  },

  async listBookingAttachments(id: string): Promise<BookingAttachment[]> {
    const res = await fetchWithAuth(`/bookings/${id}/attachments`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch attachments" }));
      throw new ApiError(res.status, err.message || "Failed to load attachments");
    }
    return res.json();
  },

  async uploadBookingAttachment(id: string, file: File): Promise<BookingAttachment> {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`/bookings/${id}/attachments`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Attachment upload failed" }));
      throw new ApiError(res.status, err.message || "Failed to upload attachment");
    }
    return res.json();
  },

  // Master Data Option Lookups
  async listCustomers(): Promise<CustomerOption[]> {
    const res = await fetchWithAuth("/customers");
    if (!res.ok) return [];
    return res.json();
  },

  async listVillages(): Promise<VillageOption[]> {
    const res = await fetchWithAuth("/villages");
    if (!res.ok) return [];
    return res.json();
  },

  async listMachines(): Promise<MachineOption[]> {
    const res = await fetchWithAuth("/machines");
    if (!res.ok) return [];
    return res.json();
  },

  async listDrivers(): Promise<DriverOption[]> {
    const res = await fetchWithAuth("/drivers");
    if (!res.ok) return [];
    return res.json();
  },

  async listPricingMethods(): Promise<PricingMethodOption[]> {
    const res = await fetchWithAuth("/pricing-methods");
    if (!res.ok) return [];
    return res.json();
  },
};
