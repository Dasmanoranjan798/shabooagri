import type { LoginResponse, User } from "../types/auth";
import type { DashboardSummaryResponse, IncomeSeriesResponse, FuelSeriesResponse, TimeRange } from "../types/dashboard";
import type {
  Booking,
  BookingAttachment,
  BookingStatus,
  CreateBookingPayload,
  PricingMethodOption,
  UpdateBookingPayload,
  VillageOption,
} from "../types/booking";
import type { Job, JobFuelEntry, JobPhoto, CompleteJobPayload, UpdateJobPayload } from "../types/job";
import type { Machine, MachineType, CreateMachinePayload, UpdateMachinePayload } from "../types/machine";
import type { Driver, CreateDriverPayload, UpdateDriverPayload } from "../types/driver";
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from "../types/customer";
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from "../types/employee";
import type { Invoice, PaymentRecord, ReceivePaymentPayload, ReceiptData } from "../types/payment";
import type { Expense, ExpenseCategory, CreateExpensePayload, UpdateExpensePayload } from "../types/expense";
import type { FuelEntry } from "../types/fuel";
import type { MaintenanceSchedule, MaintenanceRecord, CreateMaintenanceRecordPayload, CreateMaintenanceSchedulePayload } from "../types/maintenance";
import type { CompanyProfile, UpdateCompanyProfilePayload, UpdateTerminologyPayload } from "../types/settings";
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from "../types/rbac";

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
  async register(payload: {
    fullName: string;
    email?: string;
    mobileNumber?: string;
    password?: string;
    roleKey?: string;
  }): Promise<{ user: User }> {
    const res = await fetchWithAuth("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Registration failed" }));
      throw new ApiError(res.status, err.message || "Failed to create user account");
    }
    return res.json();
  },

  async login(identifier: string, password?: string, pin?: string): Promise<LoginResponse> {
    const endpoint = pin ? "/auth/login/pin" : "/auth/login/password";
    const body = pin ? { identifier, pin } : { identifier, password };

    const res = await fetchWithAuth(endpoint, {
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

  async requestOtp(identifier: string): Promise<{ message: string; devOtp?: string }> {
    const res = await fetchWithAuth("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to request OTP" }));
      throw new ApiError(res.status, err.message || "Failed to request OTP");
    }
    return res.json();
  },

  async verifyOtp(identifier: string, code: string): Promise<LoginResponse> {
    const res = await fetchWithAuth("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ identifier, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Invalid OTP code" }));
      throw new ApiError(res.status, err.message || "Invalid OTP code");
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
  async listCustomers(): Promise<Customer[]> {
    const res = await fetchWithAuth("/customers");
    if (!res.ok) return [];
    return res.json();
  },

  async getCustomerById(id: string): Promise<Customer> {
    const res = await fetchWithAuth(`/customers/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Customer not found" }));
      throw new ApiError(res.status, err.message || "Customer not found");
    }
    return res.json();
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const res = await fetchWithAuth("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create customer" }));
      throw new ApiError(res.status, err.message || "Failed to create customer");
    }
    return res.json();
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<Customer> {
    const res = await fetchWithAuth(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update customer" }));
      throw new ApiError(res.status, err.message || "Failed to update customer");
    }
    return res.json();
  },

  async deleteCustomer(id: string): Promise<void> {
    const res = await fetchWithAuth(`/customers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete customer" }));
      throw new ApiError(res.status, err.message || "Failed to delete customer");
    }
  },

  async listVillages(): Promise<VillageOption[]> {
    const res = await fetchWithAuth("/villages");
    if (!res.ok) return [];
    return res.json();
  },

  async listMachines(): Promise<Machine[]> {
    const res = await fetchWithAuth("/machines");
    if (!res.ok) return [];
    return res.json();
  },

  async getMachineById(id: string): Promise<Machine> {
    const res = await fetchWithAuth(`/machines/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Machine not found" }));
      throw new ApiError(res.status, err.message || "Machine not found");
    }
    return res.json();
  },

  async createMachine(payload: CreateMachinePayload): Promise<Machine> {
    const res = await fetchWithAuth("/machines", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create machine" }));
      throw new ApiError(res.status, err.message || "Failed to create machine");
    }
    return res.json();
  },

  async updateMachine(id: string, payload: UpdateMachinePayload): Promise<Machine> {
    const res = await fetchWithAuth(`/machines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update machine" }));
      throw new ApiError(res.status, err.message || "Failed to update machine");
    }
    return res.json();
  },

  async deleteMachine(id: string): Promise<void> {
    const res = await fetchWithAuth(`/machines/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete machine" }));
      throw new ApiError(res.status, err.message || "Failed to delete machine");
    }
  },

  async listMachineTypes(): Promise<MachineType[]> {
    const res = await fetchWithAuth("/machine-types");
    if (!res.ok) return [];
    return res.json();
  },

  async listDrivers(): Promise<Driver[]> {
    const res = await fetchWithAuth("/drivers");
    if (!res.ok) return [];
    return res.json();
  },

  async getDriverById(id: string): Promise<Driver> {
    const res = await fetchWithAuth(`/drivers/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Driver not found" }));
      throw new ApiError(res.status, err.message || "Driver not found");
    }
    return res.json();
  },

  async createDriver(payload: CreateDriverPayload): Promise<Driver> {
    const res = await fetchWithAuth("/drivers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create driver profile" }));
      throw new ApiError(res.status, err.message || "Failed to create driver profile");
    }
    return res.json();
  },

  async updateDriver(id: string, payload: UpdateDriverPayload): Promise<Driver> {
    const res = await fetchWithAuth(`/drivers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update driver" }));
      throw new ApiError(res.status, err.message || "Failed to update driver");
    }
    return res.json();
  },

  async deleteDriver(id: string): Promise<void> {
    const res = await fetchWithAuth(`/drivers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete driver" }));
      throw new ApiError(res.status, err.message || "Failed to delete driver");
    }
  },

  async listEmployees(): Promise<Employee[]> {
    const res = await fetchWithAuth("/employees");
    if (!res.ok) return [];
    return res.json();
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const res = await fetchWithAuth(`/employees/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Employee not found" }));
      throw new ApiError(res.status, err.message || "Employee not found");
    }
    return res.json();
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await fetchWithAuth("/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create employee record" }));
      throw new ApiError(res.status, err.message || "Failed to create employee record");
    }
    return res.json();
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update employee" }));
      throw new ApiError(res.status, err.message || "Failed to update employee");
    }
    return res.json();
  },

  async deleteEmployee(id: string): Promise<void> {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete employee" }));
      throw new ApiError(res.status, err.message || "Failed to delete employee");
    }
  },

  async listPricingMethods(): Promise<PricingMethodOption[]> {
    const res = await fetchWithAuth("/pricing-methods");
    if (!res.ok) return [];
    return res.json();
  },

  // Jobs
  async listJobs(): Promise<Job[]> {
    const res = await fetchWithAuth("/jobs");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch jobs" }));
      throw new ApiError(res.status, err.message || "Failed to load jobs");
    }
    return res.json();
  },

  async getJobById(id: string): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Job not found" }));
      throw new ApiError(res.status, err.message || "Job not found");
    }
    return res.json();
  },

  async updateJobDetails(id: string, data: UpdateJobPayload): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update job details" }));
      throw new ApiError(res.status, err.message || "Failed to update job");
    }
    return res.json();
  },

  async startJob(id: string, startTime?: string): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}/start`, {
      method: "POST",
      body: JSON.stringify(startTime ? { startTime } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to start job" }));
      throw new ApiError(res.status, err.message || "Failed to start job");
    }
    return res.json();
  },

  async pauseJob(id: string, note?: string): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}/pause`, {
      method: "POST",
      body: JSON.stringify(note ? { note } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to pause job" }));
      throw new ApiError(res.status, err.message || "Failed to pause job");
    }
    return res.json();
  },

  async resumeJob(id: string, note?: string): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}/resume`, {
      method: "POST",
      body: JSON.stringify(note ? { note } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to resume job" }));
      throw new ApiError(res.status, err.message || "Failed to resume job");
    }
    return res.json();
  },

  async completeJob(id: string, payload: CompleteJobPayload = {}): Promise<Job> {
    const res = await fetchWithAuth(`/jobs/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to complete job" }));
      throw new ApiError(res.status, err.message || "Failed to complete job");
    }
    return res.json();
  },

  async listJobFuelEntries(id: string): Promise<JobFuelEntry[]> {
    const res = await fetchWithAuth(`/jobs/${id}/fuel-entries`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch fuel entries" }));
      throw new ApiError(res.status, err.message || "Failed to load fuel entries");
    }
    return res.json();
  },

  async addJobFuelEntry(id: string, litres: number, cost?: number): Promise<JobFuelEntry> {
    const res = await fetchWithAuth(`/jobs/${id}/fuel-entries`, {
      method: "POST",
      body: JSON.stringify({ litres, cost }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to add fuel entry" }));
      throw new ApiError(res.status, err.message || "Failed to add fuel entry");
    }
    return res.json();
  },

  async listJobPhotos(id: string): Promise<JobPhoto[]> {
    const res = await fetchWithAuth(`/jobs/${id}/photos`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch job photos" }));
      throw new ApiError(res.status, err.message || "Failed to load job photos");
    }
    return res.json();
  },

  async uploadJobPhoto(id: string, file: File, caption?: string): Promise<JobPhoto> {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);

    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`/jobs/${id}/photos`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Photo upload failed" }));
      throw new ApiError(res.status, err.message || "Failed to upload photo");
    }
    return res.json();
  },

  // Payments & Invoices
  async listInvoices(): Promise<Invoice[]> {
    const res = await fetchWithAuth("/invoices");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch invoices" }));
      throw new ApiError(res.status, err.message || "Failed to load invoices");
    }
    return res.json();
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await fetchWithAuth(`/invoices/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Invoice not found" }));
      throw new ApiError(res.status, err.message || "Invoice not found");
    }
    return res.json();
  },

  async receivePayment(invoiceId: string, payload: ReceivePaymentPayload): Promise<Invoice> {
    const res = await fetchWithAuth(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to record payment" }));
      throw new ApiError(res.status, err.message || "Failed to record payment");
    }
    return res.json();
  },

  async getReceipt(invoiceId: string): Promise<ReceiptData> {
    const res = await fetchWithAuth(`/invoices/${invoiceId}/receipt`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Receipt not found" }));
      throw new ApiError(res.status, err.message || "Failed to load receipt");
    }
    return res.json();
  },

  async listPayments(invoiceId?: string): Promise<PaymentRecord[]> {
    const url = invoiceId ? `/payments?invoiceId=${encodeURIComponent(invoiceId)}` : "/payments";
    const res = await fetchWithAuth(url);
    if (!res.ok) return [];
    return res.json();
  },

  // Expenses
  async listExpenseCategories(): Promise<ExpenseCategory[]> {
    const res = await fetchWithAuth("/expenses/categories");
    if (!res.ok) return [];
    return res.json();
  },

  async listExpenses(filter: { categoryId?: string; machineId?: string } = {}): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (filter.categoryId) params.set("categoryId", filter.categoryId);
    if (filter.machineId) params.set("machineId", filter.machineId);
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const res = await fetchWithAuth(`/expenses${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch expenses" }));
      throw new ApiError(res.status, err.message || "Failed to load expenses");
    }
    return res.json();
  },

  async getExpenseById(id: string): Promise<Expense> {
    const res = await fetchWithAuth(`/expenses/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Expense record not found" }));
      throw new ApiError(res.status, err.message || "Expense record not found");
    }
    return res.json();
  },

  async createExpense(payload: CreateExpensePayload): Promise<Expense> {
    const res = await fetchWithAuth("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to record expense" }));
      throw new ApiError(res.status, err.message || "Failed to record expense");
    }
    return res.json();
  },

  async updateExpense(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const res = await fetchWithAuth(`/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update expense" }));
      throw new ApiError(res.status, err.message || "Failed to update expense");
    }
    return res.json();
  },

  async deleteExpense(id: string): Promise<void> {
    const res = await fetchWithAuth(`/expenses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete expense" }));
      throw new ApiError(res.status, err.message || "Failed to delete expense");
    }
  },

  // Fuel
  async listFuelEntries(filter: { machineId?: string; jobId?: string; from?: string; to?: string } = {}): Promise<FuelEntry[]> {
    const params = new URLSearchParams();
    if (filter.machineId) params.set("machineId", filter.machineId);
    if (filter.jobId) params.set("jobId", filter.jobId);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetchWithAuth(`/fuel/entries${qs}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Maintenance Schedules
  async listMaintenanceSchedules(machineId?: string): Promise<MaintenanceSchedule[]> {
    const qs = machineId ? `?machineId=${encodeURIComponent(machineId)}` : "";
    const res = await fetchWithAuth(`/maintenance/schedules${qs}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createMaintenanceSchedule(payload: CreateMaintenanceSchedulePayload): Promise<MaintenanceSchedule> {
    const res = await fetchWithAuth("/maintenance/schedules", { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create schedule" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    const res = await fetchWithAuth(`/maintenance/schedules/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete schedule" }));
      throw new ApiError(res.status, err.message);
    }
  },

  // Maintenance Records
  async listMaintenanceRecords(machineId?: string): Promise<MaintenanceRecord[]> {
    const qs = machineId ? `?machineId=${encodeURIComponent(machineId)}` : "";
    const res = await fetchWithAuth(`/maintenance/records${qs}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createMaintenanceRecord(payload: CreateMaintenanceRecordPayload): Promise<MaintenanceRecord> {
    const res = await fetchWithAuth("/maintenance/records", { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to log service record" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const res = await fetchWithAuth(`/maintenance/records/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete record" }));
      throw new ApiError(res.status, err.message);
    }
  },

  // Settings
  async getCompanyProfile(): Promise<CompanyProfile> {
    const res = await fetchWithAuth("/settings/profile");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to load company profile" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async updateCompanyProfile(payload: UpdateCompanyProfilePayload): Promise<CompanyProfile> {
    const res = await fetchWithAuth("/settings/profile", { method: "PATCH", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update company profile" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async updateTerminology(payload: UpdateTerminologyPayload): Promise<void> {
    const res = await fetchWithAuth("/settings/terminology", { method: "PATCH", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update terminology" }));
      throw new ApiError(res.status, err.message);
    }
  },

  // RBAC & Custom Roles
  async listRoles(): Promise<Role[]> {
    const res = await fetchWithAuth("/rbac/roles");
    if (!res.ok) return [];
    return res.json();
  },

  async listPermissions(): Promise<Permission[]> {
    const res = await fetchWithAuth("/rbac/permissions");
    if (!res.ok) return [];
    return res.json();
  },

  async createRole(payload: CreateRolePayload): Promise<Role> {
    const res = await fetchWithAuth("/rbac/roles", { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create role" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async updateRole(id: string, payload: UpdateRolePayload): Promise<Role> {
    const res = await fetchWithAuth(`/rbac/roles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update role" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async deleteRole(id: string): Promise<void> {
    const res = await fetchWithAuth(`/rbac/roles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete role" }));
      throw new ApiError(res.status, err.message);
    }
  },

  async assignUserRole(userId: string, roleId: string): Promise<User> {
    const res = await fetchWithAuth("/rbac/users/assign-role", {
      method: "POST",
      body: JSON.stringify({ userId, roleId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to assign role" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async createManualJob(payload: any): Promise<Job> {
    const res = await fetchWithAuth("/jobs/manual", { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create manual job" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },

  async getDriverCompensation(driverId: string): Promise<any> {
    const res = await fetchWithAuth(`/drivers/${driverId}/compensation`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch driver compensation" }));
      throw new ApiError(res.status, err.message);
    }
    return res.json();
  },
};

