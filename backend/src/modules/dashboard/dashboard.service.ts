import type { AuthenticatedUser } from "../auth/auth.types";
import * as paymentService from "../payments/payment.service";
import * as fuelService from "../fuel/fuel.service";
import { resolveCallerScope } from "../../shared/access/callerScope";
import { AppError } from "../../shared/errors/AppError";
import * as dashboardRepository from "./dashboard.repository";
import { logger } from "../../shared/logger";
import * as settingsRepo from "../settings/settings.repository";

// ---- Date / Timezone Utilities ----
//
// "Today", "This Month", etc. must be relative to the company's configured
// timezone, not the server's UTC clock. We implement this by computing the
// start-of-day / start-of-month in the company timezone using the ECMAScript
// Intl API (available in all Node.js 18+ environments), then converting back
// to UTC Date objects for database queries. No external library is needed.
//
// Approach: the company's timezone string (e.g. "Asia/Kolkata") is stored in
// companies.timezone. We call getCompanyTimezone() once per dashboard request
// and pass it through all date helpers.
//
// Documented assumption: if the company's timezone is invalid or missing, we
// fall back to "Asia/Kolkata" (the agricultural market this system was built
// for) and log a warning. This keeps the dashboard functional rather than
// crashing when a company row was inserted without a timezone value.

async function getCompanyTimezone(companyId: string): Promise<string> {
  const company = await settingsRepo.findCompanyById(companyId);
  const tz = company?.timezone ?? "Asia/Kolkata";
  try {
    // Validate by constructing a formatter. Throws RangeError on bad tz name.
    Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    logger.warn("dashboard.invalid_timezone", { companyId, tz, fallback: "Asia/Kolkata" });
    return "Asia/Kolkata";
  }
}

// Returns the wall-clock date components for a given UTC instant in a timezone.
function wallClockParts(utcDate: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(utcDate).map((p) => [p.type, p.value]));
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10), // 1-indexed
    day: parseInt(parts.day, 10),
  };
}

// Returns the UTC Date that corresponds to midnight (00:00:00.000) on the
// given local year/month/day in the specified timezone.
function localMidnightUtc(year: number, month: number, day: number, tz: string): Date {
  // ISO 8601 local string → parsed as local time by Date.parse when timezone
  // is appended correctly. We use a manual approach to avoid ambiguity:
  // construct the local string and then find the UTC offset by using
  // Date.UTC and Intl offsets.
  //
  // Strategy: create a "fake UTC" date for the local midnight, then adjust
  // by the UTC offset reported by Intl for that moment. Two-pass because
  // the offset can change (DST) at midnight itself; close enough for daily
  // buckets (DST transitions shift by 30–60 min, not an entire day).
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const localParts = wallClockParts(approxUtc, tz);
  // Compute offset: how many ms did we overshoot or undershoot local midnight?
  const approxLocal = new Date(
    Date.UTC(localParts.year, localParts.month - 1, localParts.day, 0, 0, 0),
  );
  const offsetMs = approxLocal.getTime() - approxUtc.getTime();
  return new Date(approxUtc.getTime() - offsetMs);
}

// Returns { todayStart, todayEnd, yesterdayStart, yesterdayEnd } as UTC Date
// objects, computed relative to the company timezone. "End" is exclusive
// (the first millisecond of the following day).
function buildTodayWindow(tz: string): {
  todayStart: Date;
  todayEnd: Date;
  yesterdayStart: Date;
  yesterdayEnd: Date;
} {
  const now = new Date();
  const { year, month, day } = wallClockParts(now, tz);
  const todayStart = localMidnightUtc(year, month, day, tz);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = todayStart;
  return { todayStart, todayEnd, yesterdayStart, yesterdayEnd };
}

// Returns { monthStart, monthEnd, prevMonthStart, prevMonthEnd } for "This Month"
// KPI comparison. Previous month is the same calendar month of the previous
// month (e.g. May 2026 compared with April 2026 full month).
function buildMonthWindow(tz: string): {
  monthStart: Date;
  monthEnd: Date;
  prevMonthStart: Date;
  prevMonthEnd: Date;
} {
  const now = new Date();
  const { year, month } = wallClockParts(now, tz);
  const monthStart = localMidnightUtc(year, month, 1, tz);

  // First day of next month:
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const monthEnd = localMidnightUtc(nextYear, nextMonth, 1, tz);

  // Previous month:
  let prevMonthNum = month - 1;
  let prevYear = year;
  if (prevMonthNum < 1) {
    prevMonthNum = 12;
    prevYear--;
  }
  const prevMonthStart = localMidnightUtc(prevYear, prevMonthNum, 1, tz);
  const prevMonthEnd = monthStart;

  return { monthStart, monthEnd, prevMonthStart, prevMonthEnd };
}

// Build a UTC window for a given named range (used by time-series endpoints).
// Returns { fromUtc, toUtc } where toUtc is exclusive (start of the next period).
export type TimeRange = "7d" | "30d" | "90d" | "12m";

export function buildDateRange(tz: string, range: TimeRange): { fromUtc: Date; toUtc: Date } {
  const now = new Date();
  const { year, month, day } = wallClockParts(now, tz);
  const todayEnd = new Date(localMidnightUtc(year, month, day, tz).getTime() + 24 * 60 * 60 * 1000);

  if (range === "7d") {
    return { fromUtc: new Date(todayEnd.getTime() - 7 * 24 * 60 * 60 * 1000), toUtc: todayEnd };
  }
  if (range === "30d") {
    return { fromUtc: new Date(todayEnd.getTime() - 30 * 24 * 60 * 60 * 1000), toUtc: todayEnd };
  }
  if (range === "90d") {
    return { fromUtc: new Date(todayEnd.getTime() - 90 * 24 * 60 * 60 * 1000), toUtc: todayEnd };
  }
  // "12m" — 12 full calendar months including the current month
  let fromMonth = month - 11;
  let fromYear = year;
  if (fromMonth <= 0) {
    fromMonth += 12;
    fromYear--;
  }
  return {
    fromUtc: localMidnightUtc(fromYear, fromMonth, 1, tz),
    toUtc: todayEnd,
  };
}

// ---- Today's Jobs DTO builder ----

function mapJobRow(row: Awaited<ReturnType<typeof dashboardRepository.findJobsForDateWindow>>[number]) {
  return {
    jobId: row.id,
    jobStatus: row.status,
    // Mirrors job.service.ts's withReadiness — the same "Ready to
    // Start"/"Awaiting Machine" signal the Job Cards page uses, so this
    // table doesn't fall back to showing the (mostly frozen at PENDING
    // now) raw booking status for a card that hasn't started yet.
    isReadyToStart: !!row.booking.machine && !!row.booking.driver,
    startTime: row.startTime?.toISOString() ?? null,
    endTime: row.endTime?.toISOString() ?? null,
    actualHours: row.actualHours != null ? Number(row.actualHours) : null,
    completedAcres: row.completedAcres != null ? Number(row.completedAcres) : null,
    fuelUsedLitres: row.fuelUsedLitres != null ? Number(row.fuelUsedLitres) : null,
    bookingId: row.booking.id,
    bookingNumber: row.booking.bookingNumber,
    bookingStatus: row.booking.status,
    scheduledDate: row.booking.scheduledDate.toISOString().slice(0, 10),
    scheduledTime: row.booking.scheduledTime?.toISOString() ?? null,
    location: row.booking.location ?? null,
    customer: {
      id: row.booking.customer.id,
      name: row.booking.customer.name,
      village: row.booking.customer.village ?? null,
      villageId: row.booking.customer.village ?? null,
    },
    machine: row.booking.machine
      ? {
          id: row.booking.machine.id,
          registrationNumber: row.booking.machine.registrationNumber,
          brand: row.booking.machine.brand ?? null,
          model: row.booking.machine.model ?? null,
        }
      : null,
    driver: row.booking.driver?.employee
      ? {
          id: row.booking.driver.id,
          name: row.booking.driver.employee.name,
        }
      : null,
    invoice: row.booking.invoice
      ? {
          id: row.booking.invoice.id,
          invoiceNumber: row.booking.invoice.invoiceNumber,
          totalAmount: Number(row.booking.invoice.totalAmount),
          paidAmount: Number(row.booking.invoice.paidAmount),
          balanceAmount: Number(row.booking.invoice.balanceAmount),
          status: row.booking.invoice.status,
        }
      : null,
  };
}

// ---- KPI delta helper ----

// Returns { current, previous, delta, deltaPercent } for a numeric metric.
// deltaPercent is null when previous is 0 to avoid division by zero and
// fabricated percentages (spec §1: "Do not invent misleading percentages").
function buildDelta(current: number, previous: number) {
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? Math.round((delta / previous) * 100 * 10) / 10 : null;
  return { current, previous, delta, deltaPercent };
}

// ---- Main dashboard summary ----
//
// Returns all KPIs, today's jobs, machine status, and pending payments in
// a single call. The frontend requires only one HTTP round-trip for the
// initial dashboard render. Time-series charts use dedicated endpoints
// so they can be loaded lazily and support user-selected ranges.

export async function getSummary(companyId: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);

  // Driver: narrow dashboard (only their own jobs today — no financials)
  // Farmer: no dashboard access at all (enforced by requirePermission at route level)
  // "none": no dashboard access (enforced at route level)

  const tz = await getCompanyTimezone(companyId);
  const { todayStart, todayEnd, yesterdayStart, yesterdayEnd } = buildTodayWindow(tz);
  const { monthStart, monthEnd, prevMonthStart, prevMonthEnd } = buildMonthWindow(tz);

  if (scope.kind === "driver") {
    // Driver-scoped dashboard: only today's jobs for this driver, no financials.
    const todaysJobs = await dashboardRepository.findJobsForDriverInDateWindow(
      companyId,
      scope.driverId,
      todayStart,
      todayEnd,
    );
    return {
      scope: "driver",
      todaysJobs: todaysJobs.map(mapJobRow),
      kpis: null,
      machineStatus: null,
      pendingPayments: null,
    };
  }

  if (scope.kind !== "company") {
    throw new AppError(403, "Dashboard access requires company-level permissions");
  }

  // Company-level dashboard (Owner / Manager with operations.view):
  // Run all aggregations concurrently to avoid serial waterfall DB calls.
  const [
    todayRevenue,
    yesterdayRevenue,
    monthRevenue,
    prevMonthRevenue,
    pendingBalance,
    machineStatus,
    activeDriversToday,
    activeDriversYesterday,
    jobsCompletedToday,
    jobsCompletedYesterday,
    todaysJobs,
    pendingInvoices,
  ] = await Promise.all([
    paymentService.getDashboardRevenueInWindow(companyId, todayStart, todayEnd),
    paymentService.getDashboardRevenueInWindow(companyId, yesterdayStart, yesterdayEnd),
    paymentService.getDashboardRevenueInWindow(companyId, monthStart, monthEnd),
    paymentService.getDashboardRevenueInWindow(companyId, prevMonthStart, prevMonthEnd),
    paymentService.getDashboardPendingBalance(companyId),
    dashboardRepository.getMachineStatusCounts(companyId),
    dashboardRepository.countActiveDriversInWindow(companyId, todayStart, todayEnd),
    dashboardRepository.countActiveDriversInWindow(companyId, yesterdayStart, yesterdayEnd),
    dashboardRepository.countCompletedJobsInWindow(companyId, todayStart, todayEnd),
    dashboardRepository.countCompletedJobsInWindow(companyId, yesterdayStart, yesterdayEnd),
    dashboardRepository.findJobsForDateWindow(companyId, todayStart, todayEnd),
    paymentService.getDashboardPendingInvoices(companyId),
  ]);

  // Pending collection comparison: invoices created before today start that
  // still have a balance — a rough "was there more or less pending yesterday?"
  const pendingBalancePrev = await paymentService.getDashboardPendingBalanceBefore(
    companyId,
    todayStart,
  );

  const machineWorkingPercent =
    machineStatus.activeUsable > 0
      ? Math.round((machineStatus.WORKING / machineStatus.activeUsable) * 100 * 10) / 10
      : 0;

  // Map pending invoices to a frontend-ready DTO. "Days outstanding" is
  // computed from invoiceDate (the date the invoice was created) to today.
  // We use the current UTC date for this calculation; off by at most 1 day
  // across timezone boundaries, acceptable for an age display field.
  const today = new Date();
  
  // Filter out invoices with no actual balance
  const validInvoices = pendingInvoices.filter((inv) => Number(inv.balanceAmount) > 0);
  
  // Group by customer
  const customerMap = new Map<string, any>();
  
  for (const inv of validInvoices) {
    const cId = inv.customer.id;
    if (!customerMap.has(cId)) {
      customerMap.set(cId, {
        customerId: cId,
        customerName: inv.customer.name,
        villageName: inv.customer.village ?? null,
        villageId: inv.customer.village ?? null,
        totalOutstanding: 0,
        invoices: [],
      });
    }
    
    const customer = customerMap.get(cId);
    customer.totalOutstanding += Number(inv.balanceAmount);
    
    const invoiceDateMs = new Date(inv.invoiceDate).getTime();
    const daysOutstanding = Math.max(0, Math.floor((today.getTime() - invoiceDateMs) / (1000 * 60 * 60 * 24)));
    
    customer.invoices.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      balanceAmount: Number(inv.balanceAmount),
      status: inv.status,
      invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
      daysOutstanding,
    });
  }
  
  const pendingPayments = Array.from(customerMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  return {
    scope: "company",
    kpis: {
      todayRevenue: buildDelta(todayRevenue, yesterdayRevenue),
      monthRevenue: buildDelta(monthRevenue, prevMonthRevenue),
      pendingCollection: {
        current: pendingBalance,
        previous: pendingBalancePrev,
        delta: pendingBalance - pendingBalancePrev,
        // No deltaPercent for pending collection: "previous" here is not a
        // clean prior-period number (it's a subset of current invoices)
        // so a percentage delta would be misleading per spec §1.
        deltaPercent: null,
      },
      machinesWorking: {
        working: machineStatus.WORKING,
        activeUsable: machineStatus.activeUsable,
        total: machineStatus.total,
        percent: machineWorkingPercent,
        // Machine working count doesn't have a prior-period comparison that
        // would be meaningful (status changes continuously). Return null delta.
        delta: null,
        deltaPercent: null,
      },
      driversActive: buildDelta(activeDriversToday, activeDriversYesterday),
      jobsCompleted: buildDelta(jobsCompletedToday, jobsCompletedYesterday),
    },
    machineStatus: {
      WORKING: machineStatus.WORKING,
      AVAILABLE: machineStatus.AVAILABLE,
      REPAIR: machineStatus.REPAIR,
      OFFLINE: machineStatus.OFFLINE,
      total: machineStatus.total,
      activeUsable: machineStatus.activeUsable,
    },
    todaysJobs: todaysJobs.map(mapJobRow),
    pendingPayments,
  };
}

// ---- Income Overview time-series ----
//
// Returns time-series payment data for the Income Overview line chart.
// "range" selects the window; "granularity" is derived automatically:
// - 7d / 30d / 90d → daily buckets (date: YYYY-MM-DD)
// - 12m → monthly buckets (month: YYYY-MM)
//
// Revenue definition: payments actually received (payment.receivedAt +
// payment.amount), not invoiced amounts. Consistent with KPI metrics.
// Documented in README.md.

export type IncomeSeriesPoint =
  | { date: string; amount: number }
  | { month: string; amount: number };

export async function getIncomeSeries(
  companyId: string,
  user: AuthenticatedUser,
  range: TimeRange,
): Promise<{ range: TimeRange; granularity: "day" | "month"; data: IncomeSeriesPoint[] }> {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind !== "company") {
    throw new AppError(403, "Income overview requires company-level permissions");
  }

  const tz = await getCompanyTimezone(companyId);
  const { fromUtc, toUtc } = buildDateRange(tz, range);

  if (range === "12m") {
    const data = await paymentService.getDashboardIncomeByMonth(companyId, fromUtc, toUtc);
    return { range, granularity: "month", data };
  }

  const data = await paymentService.getDashboardIncomeByDay(companyId, fromUtc, toUtc);
  return { range, granularity: "day", data };
}

// ---- Fuel Consumption time-series ----
//
// Returns daily fuel consumption (litres) for the Fuel Consumption bar chart.
// Delegates to fuelService.getLitresByDay which is backed by fuel.repository.ts —
// no fuel logic is duplicated in Dashboard.

export async function getFuelSeries(
  companyId: string,
  user: AuthenticatedUser,
  range: TimeRange,
): Promise<{ range: TimeRange; granularity: "day"; data: Array<{ date: string; litres: number }> }> {
  const scope = await resolveCallerScope(companyId, user);
  if (scope.kind !== "company") {
    throw new AppError(403, "Fuel consumption requires company-level permissions");
  }

  const tz = await getCompanyTimezone(companyId);
  const { fromUtc, toUtc } = buildDateRange(tz, range);
  const data = await fuelService.getLitresByDay(companyId, fromUtc, toUtc);

  return { range, granularity: "day", data };
}
