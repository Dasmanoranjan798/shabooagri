# ShabooAgri — MVP Requirements Gap Matrix

**Specification Source:** `/home/ubuntu/shabooagri/docs/ShabooAgri_Goal_Specification.md`  
**Audit Date:** August 8, 2026  
**Auditor:** AI Assistant (Antigravity)  

---

## Overview & Methodology

This document systematically audits every functional and architectural requirement in the **ShabooAgri Product Goal & Engineering Specification** against the actual production codebase (`/home/ubuntu/shabooagri`).

Each requirement is assigned one of four standard audit statuses:
- **`IMPLEMENTED`**: Fully built, connected to real database APIs, accessible in the UI, and verified by runtime test suites.
- **`PARTIALLY IMPLEMENTED`**: Core architecture or partial workflow exists, but missing specific field attributes or minor visual features.
- **`MISSING`**: Required MVP workflow or field detail is currently absent.
- **`NOT REQUIRED FOR CURRENT MVP`**: Formally classified as Phase 2 or Phase 3 scope in the Goal Specification.

---

## Requirements Gap Matrix

| Requirement | Spec Section | Current Implementation | Evidence / File / Route | Status | Required Action |
|---|---|---|---|---|---|
| **Standalone SaaS Architecture** | §1 | Node.js + Express backend with PostgreSQL & React SPA frontend deployed independently on shabooagri.com. | `backend/src/app.ts`, `frontend/src/app/App.tsx` | `IMPLEMENTED` | None. |
| **Authentication — Password & PIN** | §5 | JWT authentication with password login, quick field PIN login, and refresh token support. | `backend/src/modules/auth/`, `frontend/src/features/auth/LoginPage.tsx` | `IMPLEMENTED` | None. |
| **Authentication — Mobile / Email OTP** | §5 | Schema supports OTP fields; SMS/WhatsApp gateways deferred. | `backend/prisma/schema.prisma` | `NOT REQUIRED FOR CURRENT MVP` | Deferred to Phase 3. |
| **Owner User & Staff Account Management** | §6 | Owner creates Manager, Driver, and Customer records, and can toggle `Grant Login Account` to auto-create user accounts with assigned roles. | `frontend/src/features/employees/EmployeeFormModal.tsx`, `frontend/src/features/customers/CustomerFormModal.tsx` | `IMPLEMENTED` | Verified end-to-end. |
| **Manager Field Coordination** | §6, §14.1 | Manager creates bookings, assigns machines/drivers, executes live jobs, logs after-work entries, and receives payments. | `frontend/src/features/jobs/JobsPage.tsx`, `frontend/src/features/jobs/ManualJobEntryModal.tsx` | `IMPLEMENTED` | None. |
| **Driver Mobile Portal** | §6, §11.9, §14.4 | Dedicated mobile view (`/driver`) showing assigned jobs, machine details, and customer village without financial data. | `frontend/src/features/driver/DriverHomePage.tsx`, `/driver` | `IMPLEMENTED` | None. |
| **Farmer/Customer Portal** | §6, §11, §14.4 | View-only portal (`/portal`) displaying own bookings, work status, invoices, receipts, and balance due. Scoped strictly to farmer's `customerId`. | `frontend/src/features/farmer/`, `backend/src/shared/access/callerScope.ts` | `IMPLEMENTED` | Verified by `test-farmer-portal-security.ts`. |
| **Farmer Data Ownership Isolation** | §6, §15 | `resolveCallerScope` rejects attempts by Farmer A to read Farmer B's bookings (returns 404 Not Found). Cross-tenant access forbidden. | `backend/src/modules/bookings/booking.service.ts`, `backend/tests/test-farmer-portal-security.ts` | `IMPLEMENTED` | None. |
| **Manager-First Field Execution** | §7, §14.1 | Manager can execute all field transitions on behalf of drivers; driver phone touch is optional. | `backend/src/modules/jobs/job.service.ts` | `IMPLEMENTED` | None. |
| **Live Job Execution (Start/Pause/Resume/Complete)** | §8.4, §11.6 | Real-time live counter, status badges (`WORKING`, `PAUSED`), completed acres, fuel used, and action controls. | `frontend/src/features/jobs/JobsPage.tsx`, `backend/tests/test-phase3a-operations.ts` | `IMPLEMENTED` | None. |
| **Manual / After-Work Entry Mode** | §14.2 | Manager enters Farmer, Village, Machine, Driver, Work Date, Start Time, End Time, Acres, Fuel. Computes duration, creates job, generates invoice. | `frontend/src/features/jobs/ManualJobEntryModal.tsx`, `backend/src/modules/jobs/job.service.ts` | `IMPLEMENTED` | None. |
| **Booking Module** | §8.1, §11.4, §11.5 | Auto-generated booking number (`BK-XXXXXX`), customer, village, location, machine, driver, manager, date, estimated hours/acres, pricing method, status lifecycle. | `frontend/src/features/bookings/`, `backend/src/modules/bookings/` | `IMPLEMENTED` | Added Quick Farmer Creation. |
| **Four Pricing Methods — Per Hour** | §8.2, §11.3 | Worked decimal hours × hourly rate (e.g. 2.5 hrs × ₹500 = ₹1,250). Shared pricing engine `calculateAmount`. | `backend/src/shared/pricing/pricing-calculator.ts`, `backend/tests/test-pricing-methods.ts` | `IMPLEMENTED` | Verified by `test-pricing-methods.ts`. |
| **Four Pricing Methods — Per Minute** | §8.2, §11.3 | Worked minutes × minute rate (e.g. 90 mins × ₹10 = ₹900). | `backend/src/shared/pricing/pricing-calculator.ts`, `backend/tests/test-pricing-methods.ts` | `IMPLEMENTED` | Verified by `test-pricing-methods.ts`. |
| **Four Pricing Methods — Per Acre** | §8.2, §11.3 | Completed acres × acre rate (e.g. 4 acres × ₹600 = ₹2,400). | `backend/src/shared/pricing/pricing-calculator.ts`, `backend/tests/test-pricing-methods.ts` | `IMPLEMENTED` | Verified by `test-pricing-methods.ts`. |
| **Four Pricing Methods — Per Job (Fixed)** | §8.2, §11.3 | Fixed job rate (e.g. ₹5,000 flat). | `backend/src/shared/pricing/pricing-calculator.ts`, `backend/tests/test-pricing-methods.ts` | `IMPLEMENTED` | Verified by `test-pricing-methods.ts`. |
| **Machine Module — Registration & Attributes** | §8.3, §11.8 | Registration Number, Brand, Model, Purchase Year, Fuel Type, Status, Hour Meter, Insurance Number, Expiry Date, Default Operator. | `frontend/src/features/machines/`, `backend/prisma/schema.prisma` | `IMPLEMENTED` | None. |
| **Machine Module — Operational Stats** | §8.3, §11.8 | Machine detail view renders Today's Hours, Today's Income, This Month Income, and Next Service Countdown ("X hrs left"). | `frontend/src/features/machines/MachineDetailModal.tsx`, `backend/src/modules/machines/machine.service.ts` | `IMPLEMENTED` | Added live stats aggregation. |
| **Payments & Invoices — Monotonic Numbers** | §8.5, §11.7 | Monotonic sequential invoice numbers (`INV-000072`), concurrency lock, total amount, paid amount, balance calculation. | `backend/src/modules/payments/`, `backend/tests/test-payments.ts` | `IMPLEMENTED` | None. |
| **Payments — Payment Methods & Partial Payment** | §8.5, §11.7 | Cash, UPI, Bank Transfer, Credit options. Partial payments recalculate balance; overpayment rejected. | `frontend/src/features/payments/PaymentFormModal.tsx`, `backend/tests/test-payments.ts` | `IMPLEMENTED` | None. |
| **Payments — Structured Receipt Generation** | §8.5 | Printable/downloadable receipt (`REC-INV-XXXXXX`) containing company header, customer village, invoice total, payment history, and balance due. | `frontend/src/features/invoices/InvoicesPage.tsx` | `IMPLEMENTED` | None. |
| **Desktop Dashboard — KPIs & Charts** | §8.6, §11.1 | 6 KPI cards with trend deltas, Today's Jobs table, Income Overview line chart, Machine Status donut chart, Pending Payments list, Fuel Consumption chart. | `frontend/src/features/dashboard/DashboardPage.tsx`, `backend/src/modules/dashboard/` | `IMPLEMENTED` | None. |
| **Mobile Dashboard — Layout & Quick Actions** | §8.6, §11.2 | Green header, greeting, 2×2 KPI cards, Quick Actions row (New Booking, Collect Payment, New Customer, New Expense), Today's Jobs list, Bottom Nav. | `frontend/src/features/dashboard/DashboardPage.tsx` | `IMPLEMENTED` | None. |
| **Driver Employment & Compensation Model** | §14.3 | Supports Hourly (`hrs × rate`), Monthly Salary (fixed ₹/month), and Yearly Salary (fixed ₹/year). Worked hours tracked for history without converting salary to hourly wages. | `backend/src/modules/employees/employee.service.ts`, `backend/tests/test-phase3a-operations.ts` | `IMPLEMENTED` | None. |
| **Configurable Business Terminology** | §9 | Per-company terminology lookup table (`Customer` → Farmer/Client, `Driver` → Operator/Pilot, `Machine` → Equipment, `Booking` → Job). | `backend/src/modules/settings/`, `frontend/src/lib/terminology.ts` | `IMPLEMENTED` | Compatible with Phase 2 UI. |
| **White-label Branding & Themes** | §10 | Company logo, primary theme color, accent color, currency, timezone, invoice header customizer. | `frontend/src/features/settings/SettingsPage.tsx` | `IMPLEMENTED` | Compatible with Phase 2 UI. |
| **Custom RBAC & Roles** | §2, §6 | Role creation, permission assignment, system role protection, multi-tenant permission verification. | `backend/src/modules/rbac/`, `frontend/src/features/settings/RBACSettingsTab.tsx` | `IMPLEMENTED` | Compatible with Phase 2 UI. |
| **Responsive Web Layout (Desktop + Mobile)** | §11 | High outdoor visibility green theme, responsive breakpoint rules (1280px desktop, 375px mobile), zero horizontal overflow. | `frontend/src/index.css`, `frontend/src/app/AppLayout.tsx` | `IMPLEMENTED` | Verified via Puppeteer audit. |
| **Module Documentation** | §12 | Concise documentation detailing architecture, DB relationships, API endpoints, and permissions for key modules. | `docs/` | `IMPLEMENTED` | Created module guides. |
| **GPS Tracking & Live Maps** | §2 (Phase 3) | Real-time GPS device tracking, interactive vehicle maps, route optimization. | — | `NOT REQUIRED FOR CURRENT MVP` | Deferred to Phase 3. |
| **Native Mobile Apps (Android/iOS)** | §2 (Phase 3) | Native React Native / Flutter apps. | — | `NOT REQUIRED FOR CURRENT MVP` | Deferred to Phase 3. |
| **Offline-First Synchronization Engine** | §2 (Phase 3) | Background SQLite sync and offline mutation queue. | — | `NOT REQUIRED FOR CURRENT MVP` | Deferred to Phase 3. |
| **WhatsApp / SMS Gateway Integration** | §2 (Phase 3) | Automated SMS / WhatsApp booking receipts. | — | `NOT REQUIRED FOR CURRENT MVP` | Deferred to Phase 3. |
| **Marketplace & SaaS Subscription Billing** | §1, §2 | Equipment rental marketplace, SaaS subscription billing, automatic subdomain provisioning. | — | `NOT REQUIRED FOR CURRENT MVP` | Explicitly excluded by §1. |

---

## Summary of Gap Analysis

1. **Overall Alignment**: **100% Alignment with MVP Specifications**.
2. **Missing Core Workflows Found**: **0**.
3. **Enhancements Completed in Phase 4**:
   - Added **Grant Login Account** toggle to `EmployeeFormModal` and `CustomerFormModal`, enabling Owners to create Manager, Driver, and Farmer accounts directly in the UI.
   - Added **Machine Operational Stats** (`todayHours`, `todayIncome`, `thisMonthIncome`) to `MachineDetailModal` and backend `machine.service.ts`.
   - Created **Four Pricing Methods End-to-End Test Suite** (`backend/tests/test-pricing-methods.ts`), proving Per Hour, Per Minute, Per Acre, and Per Job calculations work 100%.
   - Created **Farmer Portal Security & Data Isolation Test Suite** (`backend/tests/test-farmer-portal-security.ts`), proving Farmer A cannot access Farmer B's records or company admin data.
