# Reports module

**Purpose:** Cross-module read aggregation for owner reporting: driver-wise work & earnings, machine-wise utilization, and machine maintenance status. Complements `dashboard/` (KPIs, income time-series, fuel).

**Status:** Implemented — `reports.service.ts` / `reports.controller.ts` / `reports.routes.ts` (mounted at `/reports`). Reads across jobs, work sessions, drivers, driver payments, machines, and maintenance; owns no tables.

**Endpoints (all gated by `report.generate`):**
- `GET /reports/drivers?from&to&driverId&machineId&customerId` — per driver: jobs, worked hours/minutes (session-attributed over the filtered set), period earned (hourly/per-minute), all-time earned/paid/balance.
- `GET /reports/machines?from&to&machineId&customerId` — per machine: jobs, distinct customers, worked hours/minutes (session-attributed).
- `GET /reports/machine-maintenance` — every active machine's maintenance status (total worked, since-last-service, remaining, next threshold, overdue-by, status).

**One source of truth:** all metrics derive from the same authoritative work rows the rest of the system uses (`JobWorkSession` durations / `Job.actualHours`, `driverCompensation.service`, `machineUtilization.service`, `DriverPayment`). Nothing here is a stored counter, so edits/cancellations/reassignments reconcile automatically. Cancelled jobs (status ≠ COMPLETED) are excluded. Date range is on job completion time (`endTime`).

**Note on financials vs. period:** work columns (jobs/hours/minutes/periodEarned) honor the date filter; `totalEarned`/`totalPaid`/`balance` are always all-time — the true amount owed today, which a date window would misrepresent.

**Spec reference:** docs/ShabooAgri_Goal_Specification.md
