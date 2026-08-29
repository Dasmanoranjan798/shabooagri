export interface KpiDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
}

export interface KpiMachinesWorking {
  working: number;
  activeUsable: number;
  total: number;
  percent: number;
  delta: number | null;
  deltaPercent: number | null;
}

export interface DashboardKpis {
  todayRevenue: KpiDelta;
  monthRevenue: KpiDelta;
  pendingCollection: KpiDelta;
  machinesWorking: KpiMachinesWorking;
  driversActive: KpiDelta;
  jobsCompleted: KpiDelta;
}

export interface MachineStatusCounts {
  WORKING: number;
  AVAILABLE: number;
  REPAIR: number;
  OFFLINE: number;
  total: number;
  activeUsable: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  village: string;
  villageId: string;
}

export interface MachineSummary {
  id: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
}

export interface DriverSummary {
  id: string;
  name: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
}

export interface JobRow {
  jobId: string;
  jobStatus: string;
  isReadyToStart: boolean;
  startTime: string | null;
  endTime: string | null;
  actualHours: number | null;
  completedAcres: number | null;
  fuelUsedLitres: number | null;
  bookingId: string;
  bookingNumber: string;
  bookingStatus: string;
  scheduledDate: string;
  scheduledTime: string | null;
  location: string | null;
  customer: CustomerSummary;
  machine: MachineSummary | null;
  driver: DriverSummary | null;
  invoice: InvoiceSummary | null;
}

export interface PendingInvoiceItem {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  daysOutstanding: number;
}

export interface PendingPaymentItem {
  customerId: string;
  customerName: string;
  villageId: string;
  villageName: string;
  totalOutstanding: number;
  invoices: PendingInvoiceItem[];
}

export interface DashboardSummaryResponse {
  scope: "company" | "driver";
  kpis: DashboardKpis | null;
  machineStatus: MachineStatusCounts | null;
  todaysJobs: JobRow[];
  pendingPayments: PendingPaymentItem[] | null;
}

export type TimeRange = "7d" | "30d" | "90d" | "12m";

export type IncomeSeriesPoint =
  | { date: string; amount: number }
  | { month: string; amount: number };

export interface IncomeSeriesResponse {
  range: TimeRange;
  granularity: "day" | "month";
  data: IncomeSeriesPoint[];
}

export interface FuelSeriesPoint {
  date: string;
  litres: number;
}

export interface FuelSeriesResponse {
  range: TimeRange;
  granularity: "day";
  data: FuelSeriesPoint[];
}
