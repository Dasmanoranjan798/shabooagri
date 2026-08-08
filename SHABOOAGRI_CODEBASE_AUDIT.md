# ShabooAgri — Codebase Audit & Architectural Assessment

**Date of Audit:** August 8, 2026  
**Auditor:** Antigravity AI  
**Project Name:** ShabooAgri (Agricultural Equipment Custom-Hiring Operating System)  
**Repository Path:** `/home/ubuntu/shabooagri`  

---

## 1. Executive Summary

ShabooAgri is designed as a standalone SaaS Operating System for agricultural equipment service providers (custom-hiring centers). The project currently consists of a well-architected Node.js/Express/TypeScript/Prisma backend with PostgreSQL and a Vite/React frontend scaffold.

**Key Findings:**
1. **Backend Implementation (Partially Complete ~55%):** Claude Code has built the complete foundational database schema (28 tables), authentication engine (OTP, Password, PIN, JWT, Refresh Token), RBAC engine (4 roles, permission matrix, data-level scoping), all 7 Master-Data modules (Villages, Machine Types, Machines, Employees, Drivers, Customers, Pricing Methods), Bookings module (lifecycle, attachments, monotonic counter), and Jobs module (execution, pause/resume timing, fuel, photos).
2. **Backend Deficits:** 6 backend modules remain as empty scaffolds (`payments`, `expenses`, `maintenance`, `reports`, `settings`, `notifications`).
3. **Frontend Implementation (0% Complete):** The frontend consists solely of a Vite + React scaffold displaying a placeholder div (`"ShabooAgri Frontend scaffold boots. No feature modules built yet."`). The feature and component directories exist on disk as empty folders.
4. **Code Quality & Architecture:** The existing backend code is of high quality, adhering strictly to a 4-tier modular architecture (Routes → Controllers → Services → Repositories). Architectural patterns (multi-tenant preparation, dynamic pricing engine, data-level caller scoping, monotonic booking number generator) are well executed with no duplicate business logic.
5. **Testing & Exporting Deficits:** Zero automated unit or integration tests exist in the codebase. Zero data export (Excel, PDF, CSV, Print, WhatsApp) features exist.

---

## 2. Current Technology Stack

| Layer | Component | Version / Tools | Status |
|---|---|---|---|
| **Backend Runtime** | Node.js | v22+ (`tsx` dev runner) | Verified working |
| **Backend Framework** | Express.js | v4.21.2 | Verified working |
| **Language** | TypeScript | v5.7.2 (Backend), v6.0.2 (Frontend) | Compiles cleanly (`0 errors`) |
| **Database** | PostgreSQL | `shabooagri_db` (dedicated instance) | Active & connected |
| **ORM** | Prisma | v6.1.0 | Migrations applied & verified |
| **Validation** | Zod | v3.24.1 | Enforced on all write endpoints |
| **Authentication** | JWT & Bcrypt | `jsonwebtoken` v9.0.2, `bcryptjs` v2.4.3 | Operational |
| **File Uploads** | Multer | v2.2.0 | Local disk upload (`/uploads`) |
| **Frontend Framework**| React | v19.2.8 | Scaffold boots |
| **Frontend Routing** | React Router DOM | v7.1.1 | Scaffold only |
| **Frontend Build Tool**| Vite | v8.2.0 | Compiles cleanly |
| **Linter** | Oxlint | v1.75.0 | Clean (`0 warnings, 0 errors`) |

---

## 3. Complete Architecture Overview

The ShabooAgri codebase is organized as a decoupled client-server repository within a single workspace:

```
shabooagri/
├── docs/
│   ├── ShabooAgri_Goal_Specification.md  # Single Source of Truth
│   └── ShabooAgri_UIUX.png               # Approved UI/UX Reference Mockup
├── backend/
│   ├── prisma/                           # Schema, Seed, Migrations
│   ├── src/
│   │   ├── config/                       # Environment Zod validation
│   │   ├── db/                           # Prisma client singleton
│   │   ├── middleware/                   # Auth, RBAC, Error handling
│   │   ├── modules/                      # Business modules (18 folders)
│   │   ├── shared/                       # Cross-module access, pricing, errors, utilities
│   │   ├── app.ts                        # Express application setup & route mounting
│   │   └── server.ts                     # HTTP listener & process shutdown handler
├── frontend/
│   ├── public/                           # Static assets & icons
│   ├── src/
│   │   ├── app/                          # App.tsx router entry point
│   │   ├── features/                     # Feature modules (14 folders — currently empty)
│   │   ├── components/                   # UI components (currently empty)
│   │   ├── layouts/                      # App layouts (currently empty)
│   │   └── lib/                          # Auth/terminology state (currently empty)
```

The system follows a strict 4-layer backend design:
1. **Routes (`*.routes.ts`):** Defines HTTP paths, applies `authMiddleware` and `requirePermission(...)` gates.
2. **Controllers (`*.controller.ts`):** Unpacks HTTP Request body/params/query, validates input via Zod schemas, extracts `req.user`, and calls Service methods.
3. **Services (`*.service.ts`):** Encodes pure business rules, status transition graphs, pricing formulas, and multi-module orchestrations.
4. **Repositories (`*.repository.ts`):** The ONLY layer authorized to invoke `prisma` client operations, enforcing `companyId` scoping.

---

## 4. Directory Structure Explanation

### Root Directory
- `README.md`: Outlines setup and project intent. *(Note: Outdated status section).*
- `docs/ShabooAgri_Goal_Specification.md`: Product goal, engineering spec, and phased rollout strategy.

### Backend Directory (`backend/`)
- `prisma/schema.prisma`: Single source of database truth (28 tables).
- `prisma/migrations/`:
  - `20260807184356_init_phase1_schema`: Initial baseline migration.
  - `20260808052323_add_company_next_booking_number`: Monotonic counter migration.
- `prisma/seed.ts`: Seeds `pilot` company, permissions matrix, system roles, default terminology, and pricing methods.
- `src/config/env.ts`: Zod environment variable parsing (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`, etc.).
- `src/shared/access/callerScope.ts`: Central identity resolution helper mapping `AuthenticatedUser` to Company, Driver, Customer, or None scope based on DB linkages.
- `src/shared/db/scopedRepository.ts`: Standardized tenant-scoping generic repository helper.
- `src/shared/pricing/pricing-calculator.ts`: Unit-based pricing calculation engine (`hour`, `minute`, `acre`, `flat`).
- `src/modules/`: 18 module directories (Auth, RBAC, Villages, Machine-Types, Machines, Employees, Drivers, Customers, Pricing-Methods, Bookings, Jobs, Fuel, Payments, Expenses, Maintenance, Reports, Settings, Notifications).

### Frontend Directory (`frontend/`)
- `src/app/App.tsx`: Main React component.
- `src/main.tsx`: Entry point mounting React DOM.
- `src/index.css`: CSS stylesheet.
- `src/features/`, `src/components/`, `src/layouts/`, `src/lib/`: Folder structures prepared for modular feature layout, currently containing no `.ts`/`.tsx` files.

---

## 5. Frontend Architecture

- **Framework:** React 19 + React Router DOM v7 + Vite 8.
- **Current State:** Unimplemented scaffold. Displays a static 1-page div (`ScaffoldPlaceholder`).
- **Target Architecture (per Spec §11):** Responsive web layout using shared components across desktop and mobile:
  - `OwnerManagerLayout`: Full sidebar navigation, top bar, dashboard cards, data tables, line/donut/bar charts.
  - `DriverLayout`: High-contrast mobile-first view with indigo header, job cards, live timer, navigation launcher.
  - `FarmerPortalLayout`: Simple view-only portal for booking history, invoices, and payment receipts.

---

## 6. Backend Architecture

- **Framework:** Express.js with TypeScript (`tsx` dev server, `tsc` build target).
- **Request Processing Flow:**
  `Client Request → CORS → Express JSON Parser → Route Handler → authMiddleware / optionalAuthMiddleware → requirePermission(key) → Controller Zod Validation → Service Layer (Business Logic & Caller Scope) → Scoped Repository → Prisma ORM → PostgreSQL`
- **Error Handling:** Global `errorMiddleware` intercepts thrown errors. Custom `AppError(statusCode, message)` handles domain errors (400, 401, 403, 404, 409, 429). Prisma database errors (e.g. unique constraint violations) are formatted cleanly to 409 status responses.
- **Async Execution:** `asyncHandler` wraps all Express controller handlers to prevent unhandled promise rejections.

---

## 7. Database Architecture

- **Engine:** PostgreSQL (`shabooagri_db`).
- **Prisma Models:** 28 models mapped to relational tables.
- **Key Relationships & Constraints:**
  - Foreign key relations across all entity models with default CASCADE / RESTRICT options.
  - Monotonic counter `Company.nextBookingNumber` (integer default 1) incremented atomically on booking creation (`SET next_booking_number = next_booking_number + 1`) ensuring deleted bookings never lead to reused booking numbers.
  - Unique composite constraints `@@unique([companyId, bookingNumber])`, `@@unique([companyId, registrationNumber])`, `@@unique([companyId, email])`, `@@unique([companyId, mobileNumber])`, `@@unique([companyId, name])`.
  - Indexes on filter fields: `@@index([companyId, status])` on `bookings`, `jobs`, and `invoices`.

---

## 8. Authentication Architecture

Implemented in `backend/src/modules/auth`:
1. **Login Methods Supported:**
   - Mobile / Email + 6-digit OTP (Mocked server-side console output in non-prod).
   - Email + Password (Bcrypt hashed, 10 salt rounds).
   - PIN login (4-6 digit numeric PIN hashed via Bcrypt for driver field access).
2. **Registration Bootstrap Rule:**
   - If company has 0 users: Anonymous `/auth/register` creates the first user as `Owner`.
   - If company has >0 users: `/auth/register` requires Bearer token with `user.manage` permission.
3. **Session & Token Management:**
   - Access Tokens: Short-lived JWT (15 minutes).
   - Refresh Tokens: Long-lived JWT (30 days) hashed via SHA-256 and stored in `refresh_tokens` table.
   - Token Rotation: Single-use refresh token pattern — presented refresh token is immediately revoked upon issuance of new token pair.

---

## 9. RBAC Architecture

Implemented in `backend/src/modules/rbac` and `backend/prisma/seed.ts`:
1. **Role Model:** Data-driven `roles` and `role_permissions` tables linked to `permissions`.
2. **Seeded System Roles (4 Fixed Roles):**
   - `Owner`: Granted all 19 permission keys.
   - `Manager`: Granted 16 permission keys (Operations, Bookings, Jobs, Payments, Master Data, Users, Reports).
   - `Driver`: Granted `job.update_status` only.
   - `Farmer`: Granted 0 permission keys (Access governed by data ownership).
3. **Permission Keys (19 Total):**
   `dashboard.view`, `booking.create`, `booking.edit`, `booking.delete`, `machine.assign`, `driver.assign`, `job.update_status`, `payment.receive`, `report.generate`, `user.manage`, `settings.manage`, `data.export`, `village.manage`, `machine_type.manage`, `machine.manage`, `employee.manage`, `driver.manage`, `customer.manage`, `operations.view`.
4. **Enforcement Mechanism:**
   - Route-level: `requirePermission("permission.key")` middleware.
   - Data-level: `resolveCallerScope` dynamically checks if user has `operations.view` or is linked as a `Driver` / `Customer`.

---

## 10. Multi-Tenant Architecture

- **Database Readiness:** 100% prepared. Every domain table carries a mandatory `companyId` UUID column referencing `companies(id)`.
- **Repository Isolation:** `createScopedRepository` helper ensures queries filter by `{ id, companyId }`.
- **Phase 1 Runtime Behavior:** Single-tenant execution model. Seed script initializes company slug `pilot`. Auth service retrieves `companyId` via `findSingleTenantCompany()`.
- **Configurable Terminology (§9):** `TerminologySetting` schema exists (`termKey`, `displayLabelSingular`, `displayLabelPlural`). Phase 1 seeds defaults (`Customer`, `Driver`, `Machine`, `Booking`, `Invoice`). Admin configuration UI/API is deferred to Phase 2.
- **White-Label Branding (§10):** `Company` schema includes `logoUrl`, `themeColor`, `accentColor`, `currency`, `timezone`, `invoicePrefix`, `printLayout`. Config UI is deferred to Phase 2.

---

## 11. Existing Features Inventory

| Feature / Module | Backend Status | Frontend Status | Overall Status | Notes / Missing Elements |
|---|---|---|---|---|
| Health Check (`/health`) | Complete | N/A | **Complete** | Verifies database connectivity. |
| Authentication API | Complete | Not Implemented | **Partially Complete** | Backend API complete. SMS/Email gateways mocked. Frontend UI missing. |
| User Management / Registration | Complete | Not Implemented | **Partially Complete** | Bootstrap rules & permission checks working. Frontend UI missing. |
| RBAC Permission Engine | Complete | Not Implemented | **Partially Complete** | Backend middleware & seed complete. Admin UI deferred to Phase 2 per spec. |
| Villages Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. Frontend UI missing. |
| Machine Types Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. Frontend UI missing. |
| Machines Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. Driver association working. Frontend UI missing. |
| Employees Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. User account linking supported. Frontend UI missing. |
| Drivers Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. Employee extension supported. Frontend UI missing. |
| Customers Module | Complete | Not Implemented | **Partially Complete** | CRUD API complete. Village & User linking supported. Frontend UI missing. |
| Pricing Methods & Engine | Complete | Not Implemented | **Partially Complete** | Read API & `calculateAmount` engine complete (Hour, Min, Acre, Job, Min Charge, Custom). Frontend UI missing. |
| Bookings Module | Complete | Not Implemented | **Partially Complete** | CRUD API, status transition workflow, machine/driver assignment, monotonic counter (`nextBookingNumber`), attachments working. Frontend UI missing. |
| Jobs Module | Complete | Not Implemented | **Partially Complete** | Auto-creation on `ON_THE_WAY`, start/pause/resume/complete lifecycle, actual hours calculation, fuel logging, photo attachments working. Frontend UI missing. |
| Standalone Fuel Module | Partially Complete | Not Implemented | **Partially Complete** | Fuel entries logged via Jobs API work. Standalone fuel fleet management API missing. |
| Payments & Invoices | Not Implemented | Not Implemented | **Not Implemented** | Prisma models exist. Backend module folder has only `README.md`. No API routes/controllers. |
| Expenses Module | Not Implemented | Not Implemented | **Not Implemented** | Prisma models exist. Backend module folder has only `README.md`. No API. |
| Maintenance Module | Not Implemented | Not Implemented | **Not Implemented** | Prisma models exist. Backend module folder has only `README.md`. No API. |
| Reports & Dashboards | Not Implemented | Not Implemented | **Not Implemented** | Prisma models exist. Backend module folder has only `README.md`. No aggregation API or React dashboard UI. |
| Settings & Terminology API | Not Implemented | Not Implemented | **Not Implemented** | Prisma models exist. Backend module folder has only `README.md`. No API. |
| Notifications Module | Not Implemented | Not Implemented | **Not Implemented** | Placeholder stub only. |
| Desktop Dashboard UI | Not Implemented | Not Implemented | **Not Implemented** | Spec §11.1 layout (sidebar, top bar, KPI cards, charts, jobs table) 0% built. |
| Mobile Dashboard UI | Not Implemented | Not Implemented | **Not Implemented** | Spec §11.2 layout (header, 2x2 grid, quick actions, bottom nav) 0% built. |
| Driver Mobile UX | Not Implemented | Not Implemented | **Not Implemented** | Spec §11.9 layout (indigo header, assigned job card, navigate CTA) 0% built. |
| Farmer Portal UX | Not Implemented | Not Implemented | **Not Implemented** | Spec §6 view-only portal 0% built. |
| Data Export / Sharing | Not Implemented | Not Implemented | **Not Implemented** | No Excel, PDF, CSV, Print, or WhatsApp export capabilities exist anywhere. |

---

## 12. Current User Roles

1. `Owner`: Super-user role. Has all permissions (`PERMISSIONS.map(p => p.key)`).
2. `Manager`: Primary field coordinator. Has 16 permissions to manage bookings, jobs, machines, drivers, customers, villages, employees, payments, reports, and users.
3. `Driver`: Field equipment operator. Has `job.update_status` permission. Scope limited to assigned jobs via `resolveCallerScope`.
4. `Farmer`: Customer role. Has 0 permission keys. Scope limited to own customer profile and booking/invoice history via `resolveCallerScope`.

---

## 13. Current Permissions

1. `dashboard.view`: View dashboard metrics
2. `booking.create`: Create a booking
3. `booking.edit`: Edit a booking
4. `booking.delete`: Cancel/delete a booking
5. `machine.assign`: Assign a machine to a booking
6. `driver.assign`: Assign a driver to a booking
7. `job.update_status`: Record job execution progress (start/pause/complete, hours, acres, fuel)
8. `payment.receive`: Record a payment against an invoice
9. `report.generate`: View/generate reports
10. `user.manage`: Create/edit/deactivate users
11. `settings.manage`: Change company settings
12. `data.export`: Export data
13. `village.manage`: Create/edit/delete villages
14. `machine_type.manage`: Create/edit/delete machine types
15. `machine.manage`: Create/edit/delete fleet machines
16. `employee.manage`: Create/edit/delete employee records
17. `driver.manage`: Create/edit/delete driver profiles
18. `customer.manage`: Create/edit/delete customer records
19. `operations.view`: Browse company-wide operational lists

---

## 14. Current Business Workflow

```
[1. Manager Creates Booking] ──► Status: PENDING (BK-000001 created)
            │
[2. Assign Machine & Driver] ──► Status: ACCEPTED
            │
[3. Start En-Route Travel]   ──► Status: ON_THE_WAY
            │                   └──► Auto-creates Job Record (NOT_STARTED)
            │
[4. Driver Starts Job]       ──► Job Status: WORKING / Booking Status: WORKING
            │                   ├── Action: Pause / Resume (Track paused seconds)
            │                   ├── Action: Add Photo (Multer upload)
            │                   └── Action: Log Fuel Entry (Litres & Cost)
            │
[5. Driver Completes Job]    ──► Job Status: COMPLETED / Booking Status: COMPLETED
                                └── Computes actualHours = (endTime - startTime - pausedSec) / 3600
```

*(Note: Step 6 [Generate Invoice & Receive Payment] is specified in §8.5 but not yet implemented in the backend services).*

---

## 15. Current UI/UX Implementation

- **Desktop & Mobile UI:** **0% Implemented.**
- The frontend codebase consists of `frontend/src/app/App.tsx` displaying a placeholder message. None of the screens described in §11 (Desktop Dashboard, Mobile Dashboard, Slide-out Menu, Bookings List, New Booking Form, Job In Progress, Receive Payment, Machine Details, Driver App Home) exist.

---

## 16. Data Export/Sharing Implementation

- **Status:** **0% Implemented.**
- No packages (`exceljs`, `jspdf`, `pdfmake`, `json2csv`, etc.) are installed in `package.json`.
- No endpoints or UI components exist for Excel (.xlsx), PDF, CSV, Print, Download, Share, or WhatsApp integration.

---

## 17. API Inventory

| Method | Route Path | Permission Required | Implemented Service Action |
|---|---|---|---|
| `GET` | `/health` | None | DB connection health check |
| `POST` | `/auth/register` | Anonymous (1st) / `user.manage` | User registration & token generation |
| `POST` | `/auth/otp/request` | None | Generate OTP (console logged) |
| `POST` | `/auth/otp/verify` | None | Verify OTP & issue token pair |
| `POST` | `/auth/login/password`| None | Password auth & issue token pair |
| `POST` | `/auth/login/pin` | None | PIN auth & issue token pair |
| `POST` | `/auth/refresh` | None | Refresh token rotation |
| `POST` | `/auth/logout` | None | Revoke refresh token |
| `GET` | `/auth/me` | Authenticated | Return profile of current user |
| `GET` | `/villages` | `operations.view` | List company villages |
| `GET` | `/villages/:id` | `operations.view` | Get village details |
| `POST` | `/villages` | `village.manage` | Create village |
| `PATCH` | `/villages/:id` | `village.manage` | Update village |
| `DELETE`| `/villages/:id` | `village.manage` | Delete village |
| `GET` | `/machine-types` | `operations.view` | List machine types |
| `GET` | `/machine-types/:id`| `operations.view` | Get machine type details |
| `POST` | `/machine-types` | `machine_type.manage` | Create machine type |
| `PATCH` | `/machine-types/:id`| `machine_type.manage` | Update machine type |
| `DELETE`| `/machine-types/:id`| `machine_type.manage` | Delete machine type |
| `GET` | `/machines` | `operations.view` | List machines |
| `GET` | `/machines/:id` | `operations.view` | Get machine details |
| `POST` | `/machines` | `machine.manage` | Create machine |
| `PATCH` | `/machines/:id` | `machine.manage` | Update machine |
| `DELETE`| `/machines/:id` | `machine.manage` | Delete machine |
| `GET` | `/employees` | `operations.view` | List employees |
| `GET` | `/employees/:id` | `operations.view` | Get employee details |
| `POST` | `/employees` | `employee.manage` | Create employee |
| `PATCH` | `/employees/:id` | `employee.manage` | Update employee |
| `DELETE`| `/employees/:id` | `employee.manage` | Delete employee |
| `GET` | `/drivers` | `operations.view` | List drivers |
| `GET` | `/drivers/:id` | `operations.view` | Get driver details |
| `POST` | `/drivers` | `driver.manage` | Create driver |
| `PATCH` | `/drivers/:id` | `driver.manage` | Update driver |
| `DELETE`| `/drivers/:id` | `driver.manage` | Delete driver |
| `GET` | `/customers` | `operations.view` | List customers |
| `GET` | `/customers/:id` | `operations.view` | Get customer details |
| `POST` | `/customers` | `customer.manage` | Create customer |
| `PATCH` | `/customers/:id` | `customer.manage` | Update customer |
| `DELETE`| `/customers/:id` | `customer.manage` | Delete customer |
| `GET` | `/pricing-methods` | Authenticated | List company pricing methods |
| `GET` | `/bookings` | Scoped (all roles) | List bookings matching user scope |
| `GET` | `/bookings/:id` | Scoped (all roles) | Get booking details matching user scope |
| `GET` | `/bookings/:id/attachments` | Scoped (all roles) | List booking attachments |
| `POST` | `/bookings` | `booking.create` | Create new booking (BK-xxxxxx) |
| `PATCH` | `/bookings/:id` | `booking.edit` | Update booking details |
| `PATCH` | `/bookings/:id/status` | `booking.edit` | Transition booking status |
| `PATCH` | `/bookings/:id/machine` | `machine.assign` | Assign machine to booking |
| `PATCH` | `/bookings/:id/driver` | `driver.assign` | Assign driver to booking |
| `DELETE`| `/bookings/:id` | `booking.delete` | Delete booking |
| `POST` | `/bookings/:id/attachments` | `booking.edit` | Upload booking attachment file |
| `GET` | `/jobs` | Scoped (all roles) | List jobs matching user scope |
| `GET` | `/jobs/:id` | Scoped (all roles) | Get job details matching user scope |
| `GET` | `/jobs/:id/fuel-entries` | Scoped (all roles) | List fuel entries for job |
| `GET` | `/jobs/:id/photos` | Scoped (all roles) | List photos for job |
| `PATCH` | `/jobs/:id` | `job.update_status` | Update job details |
| `POST` | `/jobs/:id/start` | `job.update_status` | Start job execution |
| `POST` | `/jobs/:id/pause` | `job.update_status` | Pause job execution |
| `POST` | `/jobs/:id/resume` | `job.update_status` | Resume job execution |
| `POST` | `/jobs/:id/complete` | `job.update_status` | Complete job & compute actual hours |
| `POST` | `/jobs/:id/fuel-entries` | `job.update_status` | Log fuel entry for job |
| `POST` | `/jobs/:id/photos` | `job.update_status` | Upload photo for job |

---

## 18. Database Table Inventory

1. `companies`: Company profile & tenancy records.
2. `terminology_settings`: Per-company custom term labels.
3. `roles`: Role definitions (Owner, Manager, Driver, Farmer).
4. `permissions`: Granular system permission definitions.
5. `role_permissions`: Role-to-permission mapping table.
6. `users`: User login accounts.
7. `customers`: Customer/farmer profiles.
8. `employees`: Staff records.
9. `drivers`: Equipment operator profiles (extends employee).
10. `villages`: Operational villages.
11. `machine_types`: Machine category classifications.
12. `machines`: Fleet equipment assets.
13. `pricing_methods`: Billing methods (per hour, per acre, etc.).
14. `bookings`: Master booking assignments.
15. `booking_attachments`: Uploaded booking photos/files.
16. `jobs`: Execution lifecycle records for bookings.
17. `job_status_log`: Timestamps of job status transitions.
18. `job_photos`: Photos captured during job execution.
19. `job_fuel_entries`: Fuel logs tied to jobs and machines.
20. `maintenance_schedules`: Preventive maintenance rules.
21. `maintenance_records`: Servicing history logs.
22. `expense_categories`: Categorization for expenses.
23. `expenses`: Business expense entries.
24. `invoices`: Customer billing slips generated from bookings.
25. `payments`: Payment receipts recorded against invoices.
26. `otp_codes`: One-time password verification codes.
27. `refresh_tokens`: Active user refresh tokens.
28. `audit_log`: System audit trail.

---

## 19. Existing Tests

- **Status:** **0 tests.**
- There are no `.test.ts` or `.spec.ts` files anywhere in `backend/src` or `frontend/src`.

---

## 20. Code Quality Assessment

- **Backend Architecture:** Excellent (`10/10`). Strict layer separation, clean TypeScript types, consistent naming conventions, explicit error handling, and robust Zod validation.
- **Documentation:** Excellent module READMEs explaining table ownership, status, and domain rules.
- **Frontend Quality:** Unimplemented scaffold (`1/10`).

---

## 21. Duplicate Code Findings

- **Result:** **No duplicate business logic found on backend.**
- Pricing formulas are consolidated in `shared/pricing/pricing-calculator.ts`.
- Tenant scoping logic is consolidated in `shared/db/scopedRepository.ts`.
- Caller access resolution is consolidated in `shared/access/callerScope.ts`.
- Controller exception wrapping is consolidated in `shared/utils/asyncHandler.ts`.

---

## 22. Security Findings

1. **Unprotected Upload Static Serving (Low-Medium Risk):** `/uploads/booking-attachments` and `/uploads/job-photos` are served static via Express without token authentication.
2. **Mock OTP Output (Development Only):** `auth.service.ts` prints OTP codes to `console.log` and returns `devOtp` in responses when `NODE_ENV !== "production"`. SMS/Email gateway integration must be added before production.
3. **Password & Token Security (Compliant):** Passwords and PINs are hashed using `bcrypt` (10 rounds). Refresh tokens use SHA-256 hash storage and single-use rotation. JWT secrets validated via Zod on startup.

---

## 23. Performance Findings

1. **Database Indexing:** Indexing is present on critical query filters (`companyId, status`).
2. **Cached Calculations:** Paused duration (`totalPausedDurationSec`) and fuel consumption (`fuelUsedLitres`) are stored as running aggregates rather than re-computed via heavy subqueries on every read.

---

## 24. Maintainability Findings

- **High Backend Maintainability:** The backend code is modular, decoupled, and easy to navigate. Adding a new module or endpoint requires minimal boilerplate without touching existing modules.
- **Schema Extensibility:** Schema is prepared for multi-tenancy, custom terminology, and white-labeling.

---

## 25. Technical Debt

1. **Root `README.md` Status Discrepancy:** Root `README.md` incorrectly states that no feature logic is implemented.
2. **Missing Driver Validation in Machine Module:** Creating a machine with an `assignedDriverId` is not pre-validated at the service layer (surfaced only via DB foreign key 409 error).
3. **Unimplemented Backend Business Modules:** `payments`, `expenses`, `maintenance`, `reports`, `settings`, `notifications` are missing API routes and logic.

---

## 26. Potential Architectural Risks

- **Driver & Farmer Identity Mapping:** The system maps users to drivers/customers via `users.id` foreign keys on `employees` and `customers`. If a driver or customer account is deleted without cleanup, orphan relations could arise.

---

## 27. Missing Requirements

1. **Frontend Application:** Complete desktop dashboard, mobile UI, driver view, and farmer portal.
2. **Invoice Generation & Payment Receipts:** Logic to convert completed jobs into invoices and log cash/UPI/credit payments.
3. **Dashboard Reporting API:** Aggregate endpoints for revenue, pending collections, active machines, and fuel consumption charts.
4. **Data Export & WhatsApp Sharing:** Excel, PDF, CSV, Print, and WhatsApp integration capabilities.
5. **Real SMS / Email OTP Gateway:** Production OTP provider integration.

---

## 28. Conflicts Between Existing Code and ShabooAgri Requirements

- **No Architectural Conflicts Found.**
- Claude Code followed `docs/ShabooAgri_Goal_Specification.md` rigorously. All implemented endpoints, tables, and workflows align with Phase 1 specification rules.

---

## 29. Recommended Improvements

1. Build backend APIs for `payments` and `invoices` (Invoice creation from completed jobs, recording payments).
2. Build backend API for `reports` / `dashboard` metrics.
3. Implement the React frontend starting with Design Tokens (CSS variables), Shared UI Components, and Layouts.
4. Build frontend feature modules mirroring the backend APIs.
5. Implement PDF/Excel export helpers and WhatsApp share links on frontend.

---

## 30. Priority Classification

### P0 = Critical (Must build next)
- Payments & Invoices Backend Module (`/payments`, `/invoices`)
- Dashboard & Reports Backend Module (`/reports`)
- Frontend Core Design System & Layouts (`OwnerManagerLayout`, `DriverLayout`, `FarmerPortalLayout`)
- Auth & Login Screens (OTP/Password/PIN) on Frontend

### P1 = Important
- Master-Data Management UI (Villages, Machines, Employees, Drivers, Customers)
- Bookings Management & Scheduling UI
- Job Execution & Live Timer UI for Drivers

### P2 = Improvement
- Standalone Expenses & Maintenance Modules
- Export Engine (PDF Invoices, Excel Reports, CSV Downloads, WhatsApp Share links)
- Real SMS / Email OTP Gateway integration

### P3 = Future (Phase 2+)
- Custom Terminology & White-Label Config UI
- Full Custom Role & Permission Builder UI
- Offline-first Sync & Native Mobile Apps

---

## 31. Files That Should NOT Be Modified Without Careful Consideration

- `backend/prisma/schema.prisma` (Base database schema — changing break active migrations)
- `backend/src/shared/access/callerScope.ts` (Core security identity resolution)
- `backend/src/shared/db/scopedRepository.ts` (Tenant isolation helper)
- `backend/src/shared/pricing/pricing-calculator.ts` (Shared pricing formula engine)
- `backend/src/modules/auth/auth.service.ts` (Authentication & token issuance engine)
- `backend/src/modules/rbac/rbac.service.ts` (Permission validation engine)

---

## 32. Safe Areas for Future Development

- `frontend/src/features/*` (All frontend features are 100% safe to build from scratch)
- `frontend/src/components/*` (All UI components are safe to build)
- `frontend/src/layouts/*` (All layouts are safe to build)
- `backend/src/modules/payments/` (Currently empty scaffold)
- `backend/src/modules/expenses/` (Currently empty scaffold)
- `backend/src/modules/maintenance/` (Currently empty scaffold)
- `backend/src/modules/reports/` (Currently empty scaffold)
- `backend/src/modules/settings/` (Currently empty scaffold)

---

## 33. Final Assessment

The existing codebase built by Claude Code represents a solid, clean, and architecturally sound foundation for the ShabooAgri backend. The backend logic enforces multi-tenant security, RBAC permissions, and domain workflows without introducing duplicate logic or technical debt.

However, **the project is currently a backend-only system** with 0% of the frontend built, and missing backend payment/report modules. Building out the missing backend endpoints followed by the full React frontend will fulfill the product vision without requiring any refactoring of existing backend code.

---
