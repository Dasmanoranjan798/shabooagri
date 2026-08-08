# ShabooAgri — Product Goal & Engineering Specification

**Owner:** Manoranjan Das
**Parent brand:** Shaboo (also owns Shaboo Business OS — multi-branch ERP/POS/Marketplace — kept separate from this product)
**Product name:** ShabooAgri (final)
**Stack:** Node.js / Express / PostgreSQL / React
**Purpose of this document:** This is the single source of truth for ShabooAgri. It merges the original engineering directive, the approved UI/UX reference screens, and the agreed build strategy. Any agent implementing this system should be able to work end-to-end from this document without needing clarification. If something is genuinely ambiguous and not covered below, the agent should make the most sensible enterprise-grade decision, document the assumption in code comments, and move on — not block on a question.

---

## 1. What ShabooAgri Is

ShabooAgri is a standalone SaaS Business Operating System for **agricultural equipment service providers** — businesses that rent out or operate tractors, rotavators, cultivators, harvesters, seed drills, paddy transplanters, sprayers, excavators, JCBs, water tankers, and similar equipment for hire.

**ShabooAgri is explicitly NOT:**
- An ERP (it does not manage general business accounting, inventory-for-sale, multi-branch retail, etc.)
- A marketplace (it does not connect multiple independent vendors to buyers)
- A clone of any existing product (Trringo, EM3 Agri, Gold Farm, or the government CHC-Farm Machinery app) — architecture and UX must be original, even where the workflows it solves are similar to competitors.

It is sold as a **sub-brand of Shaboo**, hosted on its own domain (`shabooagri.com` / `.in`), cross-linked from `business.shaboo.in`, with "A Shaboo Product" attribution in the footer/about page.

---

## 2. Build Strategy — Phased Rollout (Agreed Approach)

The original directive describes a fully mature, infinitely configurable platform. Building all of it before any real customer uses the product is a high risk of never shipping. The agreed approach is to **build the full architecture correctly from day one, but launch a deliberately reduced feature scope**, so the system can be validated with real custom-hiring-center (CHC) customers quickly, then expanded.

### Phase 1 — MVP (build first, this is the launch target)
Full support for exactly one company (single-tenant behavior is fine to start, but the schema must already be multi-tenant-capable — see §9). Includes:
- Auth (Mobile/Email + OTP, Email + Password)
- 4 fixed roles: Owner, Manager, Driver/Operator, Farmer/Customer (hardcoded permission sets — no custom role builder yet)
- Booking module (full fields, per §11.1)
- Job execution workflow (§11.2)
- Pricing engine — all 4 pricing methods (§11.3)
- Machine module (§11.4)
- Payments — record + receipt generation (§11.5)
- Dashboard — desktop and mobile, all metrics in §11.6
- Driver app view (mobile web, not native)
- Farmer/customer portal (view-only: bookings, invoices, payment history)
- Responsive web only (desktop + mobile browser) — no native apps

**Explicitly deferred to Phase 2+ (do not build in Phase 1, but do not architect in a way that blocks them later):**
- Full custom RBAC / role builder UI
- Company-level terminology configuration UI (schema should support it — see §9 — but no admin UI to edit it yet)
- White-label theming UI (logo/color upload)
- Multi-company / multi-tenant admin layer

### Phase 2 — Configurability
- Terminology configuration UI (per-company custom labels, live throughout the system)
- Full RBAC — companies create custom roles and assign individual permissions
- White-label branding (logo, theme color, accent color, invoice/print layout)
- Multi-tenant company management

### Phase 3 — Extended Platform
- Native mobile apps (Owner, Manager, Driver, Farmer, Mechanic) consuming the same APIs
- Offline-first sync for mobile apps (local storage, conflict resolution, background sync)
- GPS tracking, live maps, route planning
- Fuel analytics, IoT/equipment sensor integration
- WhatsApp/SMS integration
- Accounting, inventory, fleet maintenance automation, predictive analytics
- Public booking / marketplace layer (optional, separate consideration)

**Rule for all phases:** nothing built in Phase 1 should require rewriting existing modules to support Phase 2/3 features. Design data models and API contracts with those future features in mind even though the UI/logic for them isn't built yet.

---

## 3. AI/Agent Development Rules (Mandatory — Highest Priority)

Because this is primarily AI-developed, apply stricter discipline than typical projects:

- Never duplicate business logic or copy code across files.
- No unnecessary abstractions, no overly clever solutions, no deep folder nesting.
- Keep functions short and single-purpose; one responsibility per file.
- Strict separation: business logic ≠ UI ≠ database access ≠ API layer.
- UI components must be reusable (shared tables, forms, dialogs, validation, API utilities).
- Every important function needs a comment explaining: why it exists, what problem it solves, inputs, outputs, and any business rule it encodes. Comments explain intent, not restate code.
- Code should be understandable by a new developer joining 5 years from now: predictable, consistent, well-named, no magic values, no hidden logic.
- Before marking any module "complete," verify: no duplicated logic/UI/queries, and that validation, services, API utilities, tables, forms, and dialogs are reused rather than reimplemented.

---

## 4. Modular Architecture

Independent modules, each able to evolve without breaking others:

Auth · RBAC · Bookings · Jobs · Machines · Drivers · Customers · Employees · Payments · Expenses · Fuel · Maintenance · Reports · Settings · Notifications (future)

---

## 5. Authentication

Support at launch:
- Mobile Number + OTP
- Email + OTP
- Email + Password
- PIN login (for quick driver/field access)

Architected to allow biometric login later without rework.

---

## 6. User Types & Permissions

| Role | Access |
|---|---|
| **Owner** | Full access. Creates company, creates users, configures settings, views all reports and finances. |
| **Manager** | Primary field coordinator. Creates bookings, assigns machines/drivers, records job execution (start/end time, hours, acres, notes), receives payments if permitted. |
| **Driver/Operator** | Limited. Views only their assigned jobs, schedule, machine, and customer/farmer location. May update work status if permitted. No access to company finances, user management, or edit rights on completed bookings unless explicitly granted. |
| **Farmer/Customer** | Portal-only. Views own booking history, work status, invoices/receipts, payment history. Can download receipts. No access to company operations. |

Phase 1: these 4 roles are fixed with hardcoded permission sets matching the table above. Phase 2 makes every permission (View Dashboard, Create/Edit/Delete Booking, Assign Machine, Assign Driver, Receive Payment, Generate Reports, Manage Users, Manage Settings, Export Data, etc.) individually assignable, with companies able to create their own named roles (e.g., Supervisor, Dispatcher, Mechanic, Accountant, Office Staff).

---

## 7. Job Workflow

1. Manager creates a booking.
2. Manager assigns a machine.
3. Manager assigns a driver/operator.
4. Manager schedules the work (date/time).
5. Machine travels to location.
6. Manager records: start time, end time, hours, minutes, acres worked, notes, payment, completion status.

Note: the driver does not have to enter operational details themselves — the system must support businesses where the manager records all field activity on the driver's behalf, as well as businesses where the driver logs it directly from the field.

---

## 8. Core Modules — Field-Level Spec

### 8.1 Booking Module
Fields: Booking Number (auto-generated), Customer/Farmer, Village, Location, Machine, Operator/Driver, Manager, Date, Estimated Hours, Estimated Acres, Pricing Method, Status (Pending / Accepted / On the way / Working / Completed / Cancelled), Notes, Attachments (photos).

### 8.2 Pricing Engine
Support: Per Hour, Per Minute, Per Acre, Per Job (fixed), Minimum Charge, Custom Rate. Entire pricing configuration must be data-driven, not hardcoded in logic — adding a new pricing method later should not require touching booking/job code paths that consume the price.

### 8.3 Machine Module
Fields: Registration Number, Model, Brand, Status (Working/Available/Repair/Offline), Insurance details, Service history, Fuel type, Maintenance schedule, Assigned Operator, Current Availability, Hour Meter, Purchase Year. Machine detail view should show: today's hours, today's income, this-month income, and next-service countdown (e.g., "50 Hrs Left").

### 8.4 Job Execution
Live job screen shows: machine + customer + driver info, start time, running time (live counter), completed acres so far, fuel used, and action buttons to Pause or Complete Job. Support quick actions: Add Photo, Add Note, Fuel Entry.

### 8.5 Payments
Fields: Invoice number, Customer, Total Amount, Paid Amount, Balance (auto-calculated, highlighted if outstanding), Payment Method (Cash / UPI / Bank Transfer / Credit), Amount Received input, Receive Payment action. Must generate/store an invoice record per booking.

### 8.6 Dashboard Metrics
**Desktop:** Today's Revenue, This Month Revenue, Pending Collection, Machines Working (X/Y with % in field), Drivers Active, Jobs Completed — each with a comparison delta (vs yesterday / vs last month). Today's Jobs table (Customer, Village, Machine, Driver, Status, Amount). Income Overview chart (line, selectable time range). Machine Status donut chart (Working/Available/Repair/Offline breakdown). Pending Payments list (customer, village, amount, days overdue). Fuel Consumption bar chart (by date range).

**Mobile:** Greeting with owner's name and date. 2x2 KPI cards (Today's Revenue, Today's Jobs, Pending Payment, Machines Working). Quick Actions row (New Booking, Collect Payment, New Customer, New Expense). Today's Jobs list (See All link) showing machine, driver, time, village, status per job. Bottom nav: Home, Jobs, Machines, Customers, More.

---

## 9. Configurable Terminology (Schema now, UI in Phase 2)

Nothing about business vocabulary should be hardcoded in application logic, even though the config UI ships later. Examples of terms that must be driven by a lookup/config table, not literals in code:

Customer → Farmer/Client/Grower/Member
Driver → Operator/Machine Operator/Pilot/Employee
Machine → Equipment/Vehicle/Fleet/Asset
Booking → Job/Work Order/Assignment/Task
Invoice → Receipt/Work Receipt/Service Slip

Each company must eventually be able to set its own terminology independently and have it reflected everywhere in the UI without a code change or deploy.

---

## 10. White-Label Readiness (Schema now, UI in Phase 2)

Architecture must not block future support for: company logo, business name, theme color, accent color, language, currency, time zone, business terminology (§9), invoice style, print layout — all without touching source code once the config UI exists.

---

## 11. Responsive Design & UI/UX Specification

MVP is a **responsive web application only** — no native apps. Desktop and mobile share the same design language: consistent spacing, professional typography, minimal clutter, large touch targets, high outdoor visibility (drivers/managers often work in bright sunlight), fast loading, consistent iconography, no unnecessary animations or popups.

The following screens are approved reference UI (from provided mockups) and define the expected layout, components, and information density for each surface. Build to match this structure and visual language (green primary brand color, card-based KPIs, table + chart dashboard layout):

### 11.1 Desktop Dashboard
Left sidebar navigation (green, full height): logo, Dashboard, Bookings, Jobs, Customers, Machines, Drivers, Employees, Payments, Expenses, Fuel, Maintenance, Reports, Settings. Top bar: global search, calendar/date picker, notification bell with count badge, user profile chip (name + role). Main content: date selector; six KPI cards (Today's Revenue, This Month Revenue, Pending Collection, Machines Working X/Y, Drivers Active, Jobs Completed) each with a trend delta; "Today's Jobs" table (Customer, Village, Machine, Driver, Status badge, Amount) with a "View All" link; Income Overview line chart with a time-range dropdown; Machine Status donut chart with legend; Pending Payments list with "View All"; Fuel Consumption bar chart.

### 11.2 Mobile Dashboard
Green header bar with app name, hamburger menu, notification bell, profile icon. Personalized greeting with date. 2×2 KPI card grid. Quick Actions row of 4 icon buttons (New Booking, Collect Payment, New Customer, New Expense). "Today's Jobs" card list with "See All" link — each card shows machine, driver, time, village, status badge. Bottom tab bar: Home, Jobs, Machines, Customers, More.

### 11.3 Mobile Slide-out Menu
Full nav list matching desktop sidebar, plus user profile header and Logout at the bottom.

### 11.4 Bookings List (Mobile)
Header with back arrow and add (+) button. Filter tabs: All, Pending, Accepted, Completed. Card list per booking: customer name, village, machine, date, status badge (color-coded: Accepted/Pending/On the way/Completed).

### 11.5 New Booking Form (Mobile)
Fields in order: Customer (searchable dropdown), Village (dropdown), Machine (dropdown), Driver (dropdown), Date + Time pickers, Rate Type (segmented control: Per Hour / Per Acre / Per Minute / Fixed), Rate (₹, numeric input), Estimated Hours (numeric input), Notes (multiline text). Primary CTA: "Create Booking" (full-width, green).

### 11.6 Job In Progress (Mobile)
Machine photo + customer/village/machine/driver header. Start Time (static) and Running Time (live counter) with a status badge ("Working"). Completed Acres and Fuel Used stat cards. Secondary actions row: Add Photo, Add Note, Fuel Entry, More. Primary actions: Pause (secondary/orange) and Complete Job (primary/green).

### 11.7 Receive Payment (Mobile)
Invoice number, customer name, Total Amount, Paid Amount, Balance (red if > 0). Payment method selector (icon buttons: Cash, UPI, Bank Transfer, Credit). Amount Received numeric input. Primary CTA: "Receive Payment."

### 11.8 Machine Details (Mobile)
Machine photo, name, registration number, status badge, edit icon. Detail grid: Machine Type, Brand, Model, Purchase Year, Hour Meter, Driver, Fuel Type. Stat cards: Today's Hours, Today's Income, This Month Income, Next Service (countdown, warning color when low). "View All History" CTA.

### 11.9 Driver App Home (Mobile)
Distinct header color (secondary brand accent, e.g., indigo/purple) to visually separate the driver-facing surface from the owner/manager surface. Personalized greeting. Today's Job card: customer, village, status badge, machine, start time, running time, "Next Stop" location. Primary CTA: "Navigate" (opens maps). Bottom tab bar: Home, Jobs, Payment, Profile.

---

## 12. Documentation Requirements

Every module ships with documentation covering: purpose, architecture, database relationships, business rules, API endpoints, permissions required, configuration options, and important assumptions. Keep this alongside the code (e.g., a README per module), not in a separate wiki that drifts out of sync.

---

## 13. Definition of Done — MVP (Phase 1)

ShabooAgri Phase 1 is complete when:
1. Owner can log in, create Manager/Driver/Customer users, and see the full dashboard with live data.
2. Manager can create a booking end-to-end (customer → machine → driver → schedule), execute the job (start/pause/complete, log hours/acres/fuel), and receive payment against the invoice.
3. Driver can log in and see only their assigned job(s), with the driver-specific mobile view.
4. Farmer/Customer can log in and view their own booking history, status, and invoices.
5. All 4 pricing methods work correctly and produce an accurate invoice amount.
6. Dashboard metrics (desktop + mobile) reflect real data accurately, not placeholders.
7. The application is fully usable on both desktop and mobile browser with no horizontal scrolling or broken layouts.
8. Codebase passes the engineering quality checklist in §3 (no duplication, proper module separation, documented functions).
9. It has been piloted with at least one real equipment-service business/CHC to validate the workflow before wider rollout.

---

## 14. Phase 3A — Manager-First Field Operations & Driver Compensation Specification

### 14.1 Operational Philosophy: Manager-First Field Execution
- **Central Coordinator:** The Owner/Manager is the primary operational user of ShabooAgri. All job management actions (creation, scheduling, starting, pausing, resuming, completing, manual entry) can be executed directly by authorized Managers on behalf of Drivers.
- **Driver Phone Interaction is Optional:** Phone interaction by Drivers is optional for completing field work. Driver interface is simple and view-oriented for assigned work.

### 14.2 Execution Modes: Live Execution & Manual / After-Work Entry
- **Single Job Record Architecture:** Both Live Execution Mode and Manual / After-Work Entry Mode share the exact same `Job` record, database schema, pricing engine, invoice generator, and dashboard metrics.
- **Live Execution Mode (`LIVE`):** Real-time field execution with `start`, `pause`, `resume`, `complete` status transitions and live counter.
- **Manual / After-Work Entry Mode (`MANUAL` / `AFTER_WORK`):** Allows Manager/Owner to log completed jobs after field work finishes (recording Farmer, Village, Machine, Driver, Work Date, Start Time, End Time, actual hours, acres, fuel, and notes). Automatically derives work duration, calculates invoice amounts, and updates driver work records.

### 14.3 Driver Compensation & Employment Model
- **Work Hours ≠ Salary Calculation:** Driver operational work duration (hours worked) is tracked as field history. Driver compensation calculation depends strictly on employment agreement type:
  1. `HOURLY`: Earnings are calculated directly from worked job hours (`actualHours × hourlyRate`).
  2. `MONTHLY`: Fixed monthly salary (`monthlySalary`). Job hours are tracked for operational history only and MUST NOT be converted to hourly wages.
  3. `YEARLY`: Fixed annual salary (`yearlySalary`). Job hours are tracked for operational history only.

### 14.4 Role Scoping & Access Rules
- **Manager:** Full operational control (create farmer/booking/job, execute status transitions, perform after-work entry, record fuel/acres, receive payment).
- **Driver:** Restricted view of assigned jobs, machine status, farmer location, completed work duration, and compensation info where applicable.
- **Farmer:** Portal view-only (bookings, completed work, invoices, payment receipts, balance).

---

*End of specification. This document supersedes informal notes; update it in place as scope changes rather than creating parallel spec documents.*
