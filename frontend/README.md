# ShabooAgri Frontend — Foundation & Dashboard UI

## Overview

The ShabooAgri Frontend is a responsive React TypeScript single-page application (§2, §11) designed for agricultural equipment service providers. It connects directly to the ShabooAgri Express/PostgreSQL backend APIs to display real-time operational and financial metrics.

## Architecture

```
frontend/src/
├── app/
│   ├── App.tsx             # Application router & AuthProvider wrapper
│   └── ProtectedRoute.tsx  # Auth guard & permission check wrapper
├── components/
│   ├── charts/
│   │   ├── FuelConsumptionChart.tsx  # SVG Bar Chart (daily fuel litres)
│   │   ├── IncomeOverviewChart.tsx   # SVG Line Chart (income time-series)
│   │   └── MachineStatusDonut.tsx    # SVG Donut Chart (fleet breakdown)
│   └── ui/
│       ├── Badge.tsx       # Color-coded status badge component
│       ├── Button.tsx      # Reusable button with loading spinner
│       ├── Card.tsx        # Card container with title & action slots
│       ├── Input.tsx       # Form input with label & error support
│       └── Spinner.tsx     # Loading indicator
├── context/
│   └── AuthContext.tsx     # Session state, JWT handling, role/permission helpers
├── features/
│   ├── auth/
│   │   └── LoginPage.tsx   # Password & Quick PIN authentication UI
│   ├── dashboard/
│   │   ├── DashboardPage.tsx       # Main page container & API data loader
│   │   ├── DesktopDashboard.tsx    # §11.1 Desktop dashboard grid & charts
│   │   ├── MobileDashboard.tsx     # §11.2 Mobile greeting, 2x2 grid, quick actions
│   │   ├── KpiCard.tsx             # Metric card with trend delta indicators
│   │   ├── TodaysJobsTable.tsx     # Scheduled operations table & card list
│   │   └── PendingPaymentsList.tsx # Invoices awaiting collection widget
│   └── placeholder/
│       └── PlaceholderPage.tsx     # Placeholder container for non-dashboard Phase 1 links
├── layouts/
│   └── AppLayout.tsx       # Role-aware desktop sidebar, mobile header, slide-out drawer, bottom nav
├── lib/
│   ├── api.ts              # Fetch client wrapper with auto JWT auth header & refresh token logic
│   ├── terminology.ts      # §9 Configurable business terms helper
│   └── theme.ts            # §10 White-label theme tokens & currency formatters
└── types/
    ├── auth.ts             # Auth & user role TypeScript interfaces
    └── dashboard.ts        # Dashboard DTO TypeScript interfaces
```

## Session & Authentication Foundation

- Token Handling: Stores access token in memory/localStorage and refresh token in localStorage upon `/auth/login`. Automatically injects `Authorization: Bearer <accessToken>` header on API requests.
- Token Refresh: Intercepts `401` responses and transparently refreshes access token via `POST /auth/refresh`.
- Route Protection: `ProtectedRoute` gates authenticated paths (`/`) and verifies user permissions (e.g. `operations.view`, `dashboard.view`).
- Role-Aware Shell: Hides inaccessible navigation options dynamically based on caller role (`owner`, `manager`, `driver`, `farmer`).

## Layout & Responsive Strategy

- **Desktop (§11.1)**:
  - Green full-height sidebar (`#1B7A3E`) with app branding, subtext ("A Shaboo Product"), navigation links.
  - Top bar with global search box, current date display, notification bell, user profile chip.
  - 6 KPI cards grid (Today's Revenue, This Month Revenue, Pending Collection, Machines Working X/Y, Drivers Active, Jobs Completed).
  - Main 2-column layout: Today's Jobs table, Income Overview SVG line chart with range selector (7d, 30d, 90d, 12m), Machine Status SVG donut chart, Pending Payments list, Fuel Consumption SVG bar chart.
- **Mobile (§11.2 & §11.3)**:
  - Green header bar with logo, hamburger drawer menu button, notification icon, profile chip.
  - Personalized greeting with date banner.
  - 2×2 KPI card grid.
  - Quick Actions row of 4 icon buttons (New Booking, Collect Payment, New Customer, New Expense).
  - Today's Jobs mobile card list.
  - Bottom navigation bar (Home, Jobs, Machines, Customers, More).

## Design & Terminology Standards

- **Terminology (§9)**: Driven by `lib/terminology.ts` helper (`getTerm("customer")`, `getTerm("machine")`, etc.) so literal strings are not hardcoded across components.
- **White-Label Readiness (§10)**: Controlled via `lib/theme.ts` and CSS custom variables (`--color-primary`, `--color-accent`, etc.).
