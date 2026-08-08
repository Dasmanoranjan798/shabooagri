# Dashboard Module

## Overview

The Dashboard module provides real-time operational and financial metrics for ShabooAgri (§8.6, §11.1, §11.2). It aggregates metrics across Bookings, Jobs, Machines, Drivers, Payments, and Fuel modules while adhering strictly to modular boundaries and company-level tenant isolation.

## Architecture

Following the system-wide standard (`validators -> repository -> service -> controller -> routes`):

- `dashboard.routes.ts`: Defines Express routes for `/dashboard/*`, protected by `authMiddleware`.
- `dashboard.controller.ts`: Extracts HTTP query parameters (`range`), resolves authenticated user context, and delegates to service layer.
- `dashboard.service.ts`: Handles company timezone resolution, window calculation (today, yesterday, this month, previous month), caller scoping via `resolveCallerScope`, and KPI/DTO assembly.
- `dashboard.repository.ts`: Executes PostgreSQL aggregation queries for machine status counts, active driver counts, completed job counts, and scheduled jobs table retrieval.

### Cross-Module Boundaries

Dashboard respects domain boundaries and does NOT query external tables directly where established services exist:
- **Payments / Invoices**: Aggregations (revenue in window, pending balance, income time-series, pending invoices list) are queried via pass-through methods in `payment.service.ts` backed by `payment.repository.ts`.
- **Fuel**: Daily fuel consumption time-series is queried via `fuelService.getLitresByDay()`, backed by `fuel.repository.ts`.
- **Access Control**: Scoping is resolved via `resolveCallerScope` in `shared/access/callerScope.ts`.

## API Endpoints

All endpoints require authentication (`Bearer <JWT>`).

### 1. GET `/dashboard/summary`
Returns comprehensive dashboard KPIs, machine status breakdown, today's scheduled jobs, and pending payments list in a single HTTP response.

- **Permissions**: Owner & Manager receive full company metrics; Driver receives only their assigned jobs for today (no financials); Farmer / Unauthenticated users are rejected with `403` / `401`.
- **Response Structure**:
  - `scope`: `"company"` | `"driver"`
  - `kpis`:
    - `todayRevenue`: `{ current, previous, delta, deltaPercent }`
    - `monthRevenue`: `{ current, previous, delta, deltaPercent }`
    - `pendingCollection`: `{ current, previous, delta, deltaPercent: null }`
    - `machinesWorking`: `{ working, activeUsable, total, percent, delta: null, deltaPercent: null }`
    - `driversActive`: `{ current, previous, delta, deltaPercent }`
    - `jobsCompleted`: `{ current, previous, delta, deltaPercent }`
  - `machineStatus`: `{ WORKING, AVAILABLE, REPAIR, OFFLINE, total, activeUsable }`
  - `todaysJobs`: Array of job DTOs scheduled for today (Customer, Village, Machine, Driver, Status, Invoice amounts)
  - `pendingPayments`: Array of unpaid/partially-paid invoice DTOs with `daysOutstanding`

### 2. GET `/dashboard/income?range=7d|30d|90d|12m`
Returns time-series payment data for the Income Overview line chart.

- **Parameters**: `range` (`7d` | `30d` | `90d` | `12m`, defaults to `30d`)
- **Granularity**: `day` for `7d`/`30d`/`90d` (`{ date: "YYYY-MM-DD", amount }`), `month` for `12m` (`{ month: "YYYY-MM", amount }`).
- **Permissions**: Owner & Manager only (`403` for Driver/Farmer).

### 3. GET `/dashboard/fuel?range=7d|30d|90d|12m`
Returns time-series fuel consumption data (litres) for the Fuel Consumption bar chart.

- **Parameters**: `range` (`7d` | `30d` | `90d` | `12m`, defaults to `30d`)
- **Granularity**: `day` (`{ date: "YYYY-MM-DD", litres }`).
- **Permissions**: Owner & Manager only (`403` for Driver/Farmer).

## Metric Definitions & Business Logic

1. **Today's Revenue**: Sum of payments received (`payment.receivedAt`) within today's local date window (00:00 to 24:00 in company timezone). Compared against yesterday's revenue window for trend delta.
2. **This Month Revenue**: Sum of payments received within the current calendar month window. Compared against previous calendar month for trend delta.
3. **Pending Collection**: Sum of `balanceAmount` across all invoices with `status IN ('UNPAID', 'PARTIALLY_PAID')`.
4. **Machines Working**: Count of active fleet machines with `status = 'WORKING'`. Percentage calculated against `activeUsable` machines (`WORKING` + `AVAILABLE`).
5. **Drivers Active**: Count of distinct drivers assigned to jobs in `WORKING` or `PAUSED` status scheduled for today.
6. **Jobs Completed**: Count of jobs with `status = 'COMPLETED'` and `endTime` falling within today's window.
7. **Today's Jobs**: Jobs with `booking.scheduledDate` falling within today's local date window. Includes complete relations (Customer, Village, Machine, Driver, Booking, Invoice).
8. **Pending Payments**: List of unpaid/partially-paid invoices with `daysOutstanding` calculated relative to `invoiceDate`.

## Timezone Handling

All date windows ("Today", "This Month", ranges) are evaluated relative to the company's configured timezone (stored in `companies.timezone`, defaulting to `"Asia/Kolkata"` if unspecified). Timezone calculations use Node.js native `Intl.DateTimeFormat` to convert local midnight boundaries into UTC `Date` objects for database queries, avoiding server UTC clock drift.

## Security & Sensitive Fields

- Security scoping is enforced using `resolveCallerScope`. No hardcoded role checks are used.
- All database queries include `companyId` filtering for strict multi-tenant isolation.
- DTO mappers explicitly pick public display fields. Password hashes, PIN hashes, refresh tokens, and internal auth fields are never included in responses.
