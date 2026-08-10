# Reports module

**Purpose:** Cross-module read aggregation for dashboards: revenue, pending collection, machine utilization, fuel consumption (§8.6, §11.1-11.2).

**Status:** Implemented via `backend/src/modules/dashboard/` (dashboard.service.ts, dashboard.controller.ts, dashboard.routes.ts), providing cross-module read aggregation for KPIs, income time-series, and fuel consumption series. Frontend surface is rendered by `frontend/src/features/reports/ReportsPage.tsx`.

**Owns tables:** (reads across other modules' tables; owns none)

**Spec reference:** docs/ShabooAgri_Goal_Specification.md
