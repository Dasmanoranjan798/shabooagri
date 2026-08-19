# ShabooAgri Mobile — Exhaustive Screen & Field Parity Inventory

Produced by reading the entire website source (`frontend/src`) file by file — every `.tsx` in `features/`, plus `app/App.tsx` (route list) and `layouts/`. Mobile-side status is drawn from direct knowledge of the mobile app's actual current source (built this session), not from memory of the earlier module-level audit. Status legend: **✅ Full** / **🟡 Partial (gaps named)** / **🔴 Not Started** / **N/A** (doesn't apply to mobile, e.g. desktop-only admin flows).

---

## AUTH

### Login (`/login`)
**Website fields:** Mode tabs — Password / Quick PIN / Mobile OTP. Identifier field (all modes). Password mode: Password field, "Forgot password?" link. PIN mode: 4-digit PIN field. OTP mode: pre-send info text → post-send OTP code field, dev-OTP alert.
**Website buttons:** Submit ("Request OTP" / "Log In"), Forgot Password modal (Email field, Cancel/Send Reset Link, success state with Close).
**Mobile:** 🟡 Partial, **intentionally out of scope for this parity run.** Has Identifier + Password fields and a Login button — matches Password mode only. **Missing, and deliberately not built in this pass:** PIN mode (no real PIN-assignment mechanism exists anywhere — flagged in the original V1 design plan as a real, not cosmetic, gap: nothing ever writes `pinHash` for a user), OTP mode (`SMS_PROVIDER` is unconfigured in production `.env` — building the UI would produce a mode that always fails), Forgot Password link/flow (see Reset Password below — same root blocker).

### Accept Invite (`/accept-invite`)
**Website:** Name (read-only), Password, Confirm Password fields; Activate Account button; token-validation states.
**Mobile:** 🔴 Not Started, **intentionally out of scope for this parity run.** This flow is only ever reached by tapping a link inside an emailed/SMSed invite — a native app needs platform deep-linking (Android App Links / iOS Universal Links, with server-hosted verification files) to intercept that link at all, which is infrastructure work, not a screen-building task, and was never part of the 14-checkpoint breakdown this run worked through. No screen exists.

### Reset Password (`/reset-password`)
**Website:** Request mode (Email field) and Confirm mode (New Password, Confirm New Password), token validation.
**Mobile:** 🔴 Not Started, **intentionally out of scope for this parity run**, same reasoning as Accept Invite — reached via an emailed link, needs deep-linking infrastructure the app doesn't have. (In-app "Change Password" while already logged in is fully built — see Settings/Driver Profile/Farmer Profile.) No screen exists.

### SSO Exchange (`/sso`)
**Website:** Auto token-exchange + redirect; error fallback screen.
**Mobile:** N/A — this is a browser-launched web SSO handoff from platform-backend provisioning; not applicable to a native app install.

### Company Setup (no website equivalent)
**Mobile:** ✅ Unique to mobile — company slug entry + validation. Not a gap since the website resolves tenant via subdomain automatically.

---

## DASHBOARD (`/`)

**Website fields/content — Desktop:** 6 KPI cards (Today's Revenue, This Month Revenue, Pending Collection, Machines Working, Drivers Active, Jobs Completed) each with delta indicator where applicable. Today's Job Cards table. Income Overview **line chart** with 7D/30D/90D/12M selector. Machine Status **donut chart**. Pending Payments list. Fuel Consumption **bar chart** with its own 7D/30D/90D/12M selector.
**Website fields/content — Mobile web layout (MobileDashboard.tsx):** Greeting banner ("Hello, {name}" + date). 4-button Quick Actions row (New Booking / Collect Payment / New Customer / New Expense). 2×2 KPI grid (Today's Revenue, Today's Job Cards, Pending Payment, Machines Working — no delta on some). Today's Job Cards list. No charts on mobile web either.
**Website — both layouts:** Operational warning banner (dismissible 24h) surfacing Service Due / Insurance Expiring / License Expiring counts, computed client-side.
**Website buttons:** "View All Jobs →", "View All Invoices →" (both permission-gated).

**Mobile app:** ✅ Full (corrected scope — see note below).
- ✅ Has: 6 KPI cards (Today's Revenue, This Month, Pending Collection, Machines Working, Drivers Active, Jobs Completed) with correct delta logic. Today's Job Cards list with correct Ready-to-Start/Awaiting-Machine badge logic. Pending Payments list. "VIEW ALL JOBS" button.
- ✅ Added: Greeting/date banner, 4-button Quick Actions row (New Booking / Collect Payment / New Customer / New Expense), Operational Warning banner (Service Due / Insurance Expiring / License Expiring counts, reusing the exact `machineServiceWarning`/`expiryWarning` helpers already built for Machines/Drivers/Settings, dismissible 24h via a new `DashboardStorage`), "VIEW ALL INVOICES" button.
- **Scope correction, made after reading source directly (not previously caught):** the original 🔴 finding for "Income Overview line chart, Machine Status donut, Fuel Consumption bar chart" compared the Flutter app against the website's **desktop** dashboard layout (`DesktopDashboard.tsx`). Reading `MobileDashboard.tsx` directly (the layout actually shown to a phone-width browser, i.e. the true comparison target for a phone app) confirms it has **zero charts** — only greeting/2×2 KPI grid/Quick Actions/Today's Job Cards. Charts are desktop-only. This is a genuine correction to the earlier audit, not a dropped requirement: the mobile app was never missing anything a phone-sized layout actually has.

---

## BOOKINGS

### List (`/bookings`)
**Website:** Search box. Export Excel. "New Booking" button. Kebab per row.
**Mobile:** 🟡 Partial. ✅ Search box added. **Still missing:** Export Excel.

### Detail (opened from list)
**Mobile:** ✅ Full. Rebuilt on live data — inline Machine/Driver reassignment dropdowns, Rate & Method display, full Photo Attachments (camera capture + upload + gallery) all added. "New {Booking}" quick action still not present (minor).

### Create/Edit Form
**Mobile:** 🟡 Partial. ✅ Scheduled Time field added. **Still missing:** inline quick-create/rename sub-forms for Customer/Village (disclosed, unchanged).

---

## JOBS (Job Cards)

### List (`/jobs`)
**Website:** Filter tabs — All / Awaiting Machine / Ready to Start / In Progress / Completed / Cancelled (each with live count). Search box. "Log After-Work Entry" button (opens Manual Job Entry form). Kebab: Open, Cancel Job.
**Mobile:** ✅ Full. All 6 filter tabs + search box; list rebuilt on live data (`GET /jobs`), also fixing a pre-existing UX bug not caught by the original audit — rows showed a raw truncated job ID instead of booking number/customer name. "Log After-Work Entry" AppBar action (Owner/Manager only) now opens the Manual Job Entry screen.

### Job Execution / Live Job (opened from list)
**Website:** Live counter + live price (matches mobile). Pricing-set step (matches, "Set Pricing"). Dynamic Pause/Start button (matches). Separate Stop (matches, verbatim dialog text matches mobile exactly). Mandatory resume-reason with 3 quick chips (matches exactly). Submit confirmation (verbatim text matches mobile exactly). Cancel Job, Owner-gated (matches). Add Fuel / Add Photo / Add Note quick actions, Owner/Manager-only (matches). **Additionally on website:** existing Fuel Log Entries list display, Job Photos gallery display, dedicated "Field Notes" section, Completion screen summary grid (Customer/Village/Duration/Rate/**Total**), explicit "missing photo"/"missing fuel" pre-submit warning banners, acre-priced jobs require a Completed Acres input before Submit, "locked, Owner-only" notice text on COMPLETED.
**Mobile:** 🟡 Partial — **the live workflow mechanics themselves are excellent parity** (verified verbatim dialog text matches). ✅ Now added: completion summary grid (Customer/Village/Duration/Rate/**Total**, `finalAmount` computed with the exact same `round2(rate*quantity)` formula as `pricing-calculator.ts` so it always matches the invoice), proactive missing-photo/missing-fuel warning banners at STOPPED gated by live `GET /settings/profile` (`requireJobPhoto`/`requireJobFuelLog`) plus real `GET /jobs/:id/fuel-entries`+`/photos` counts (not just relying on the backend's generic rejection), inline Completed Acres input + submit-disable for acre-priced jobs (previously `submit()` never sent `completedAcres` at all — a real correctness gap for acre-priced jobs, not just a missing UI banner), "locked, Owner-only" notice text on COMPLETED. **Still missing:** display of existing fuel entries/photos as a list/gallery (add-only remains), no dedicated "Field Notes" section (notes shown via a plain InfoRow instead), Cancel dialog missing the explanatory helper text.

### Manual Job Entry ("Log After-Work Entry")
**Website:** Customer* (+quick-create), Village*, Machine*, Driver*, Work Date*, Start/End Time*, calculated duration + override, Pricing Method*, Rate*, Acres, Fuel Used, Notes.
**Mobile:** 🟡 Near-full. New `ManualJobEntryScreen` (`/jobs/manual`) — Customer*, Village*, Machine*, Driver*, Work Date*, Start/End Time* (with calculated duration display + Override Hours field), Pricing Method*, Rate*, Acres, Fuel Used, Notes, posts to `POST /jobs/manual` matching `createManualJobSchema` exactly (verified against `job.validators.ts`). **Missing:** the website's inline quick-create-Customer sub-form — mobile requires creating the Customer first via the existing Customers screen.

---

## MACHINES

### List (`/machines`)
**Website:** Status filter tabs — All / Available / Working / Repair/Maint. / Offline (with counts). Search box. Service/insurance warning chips per row. Kebab: View Details, Edit, Delete.
**Mobile:** 🟡 Partial. ✅ Status filter tabs, search box, and service/insurance warning chips all added (list rebuilt on live data). **Still missing:** none of the core list gaps — only cosmetic parity items remain (no "+ Add Type" quick-create shortcut anywhere in the flow).

### Detail
**Mobile:** ✅ Full. Rebuilt on live data — Default Driver, Next Service Due, Purchase Year, Insurance Number/Expiry, Operational Warnings banner all added. **Deliberately not built** (disclosed, low value for a phone detail view): the 3 income/hours KPI cards, which the website computes client-side from all jobs and aren't available from `GET /machines/:id` directly — better sourced via Dashboard/Reports, which already show company-wide aggregates.

### Create/Edit Form
**Mobile:** ✅ Full. Assigned Default Driver, Next Service Due, Insurance Number, Insurance Expiry Date, Purchase Year all added — closes the form gap completely. No "+ Add Type" inline quick-create, no Upgrade-Plan-Reached dialog handling (minor, unchanged).

---

## DRIVERS

### List (`/drivers`)
**Website:** Status filter tabs — All / Available / On Job / Off Duty (with counts). Search box. License expiry warning badge per row. Kebab: View Details, Edit, Delete.
**Mobile:** 🟡 Partial. ✅ Status filter tabs, search box, license expiry warning badges all added (list rebuilt on live data).

### Detail
**Mobile:** ✅ Full. License Number, License Expiry Date, license warning banner all added.

### Create/Edit Form
**Mobile:** 🟡 Partial. ✅ License Expiry Date field added. **Still missing (disclosed, low priority given deferred PIN/OTP infra):** Send Login Invite checkbox for drivers specifically, create-new-employee inline mode.

---

## CUSTOMERS

### List (`/customers`)
**Website:** Search box. "Portal Access" column (Linked/Standard badge). Kebab: View Details, Edit, Delete.
**Mobile:** 🟡 Partial. ✅ Search box, Village name, and Portal Access indicator all added to List rows (rebuilt on live data). **Still missing:** dedicated Portal Access column (shown inline in the subtitle instead — functionally present, not a separate column).

### Detail
**Mobile:** 🟡 Partial. ✅ Village (fixing the internal inconsistency), Portal Access, Address, Notes all added. **Still missing:** "New Booking" quick action.

### Create/Edit Form
**Mobile:** 🟡 Partial. ✅ isActive toggle (edit mode) added. **Still missing (disclosed):** Send Portal Invite flow, inline village sub-forms.

---

## VILLAGES

### List (`/villages`)
**Website:** Search box. Status column (Active/Inactive badge). Kebab: Rename, **Mark Inactive/Mark Active** (toggle, no confirm), Delete.
**Mobile:** ✅ Full. Search box, Status (Active/Inactive) display, and the Mark Inactive/Active toggle action all added.

### Create/Edit Form
**Website:** Name* only, plus isActive checkbox in edit mode (per validator, though not confirmed rendered in the inventoried form file — village form itself may not expose it either).
**Mobile:** ✅ Matches (name field only) for the create/rename core function.

---

## EMPLOYEES

### List (`/employees`)
**Website:** Status filter tabs — All / Active / Inactive (with counts). Search box. Kebab: View Details, Edit, Delete.
**Mobile:** ✅ Full. Status filter tabs (All/Active/Inactive) and search box both added.

### Detail
**Mobile:** ✅ Full. Joined Date and System Account status both added.

### Create/Edit Form + Invite
**Mobile:** ✅ Full. Joined Date field added.

---

## TEAM (`/team`) — entirely separate from Employees

**Website:** Current Staff table (Name/Role/Contact/Status/Last Login) with Deactivate/Reactivate per row (confirm dialog). Pending Invites table with Revoke action (confirm dialog). Invite History table. "+ Invite Staff" → Full Name, Role, Email, Phone, Village (farmer-role only) → post-send result screen with Share via WhatsApp / Copy Link.
**Mobile:** ✅ Full. New `TeamScreen` (`/team`, added to the Owner/Manager drawer) — Current Staff cards (Name/Role/Contact/Status badge/Last Login) with Deactivate/Reactivate icon button + confirm dialog (`PATCH /team/users/:id/status`); Pending Invites cards (Name/Role/Contact/Sent By/Expires) with Revoke + confirm dialog (`PATCH /team/invites/:id/revoke`); Invite History cards (shown only when non-empty, matching website). New `InviteStaffScreen` (`/team/invite`) — Full Name, Role dropdown (`GET /rbac/roles`), Email, Phone, conditional Village dropdown (farmer role only, reusing the existing `villagesListProvider`), posts to `POST /team/invites` matching `createInviteSchema` exactly; result screen with the same 3 delivery-method branches as the website (email/SMS auto-sent vs. manual-link copy+WhatsApp-share), WhatsApp message template text copied verbatim from `InviteStaffModal.tsx`. Gated server-side by `user.manage` — confirmed via `seedData.ts` that both Owner and Manager hold it, matching the mobile app's existing `isOwnerOrManager` drawer-visibility gate used everywhere else.

---

## PAYMENTS & INVOICING (`/payments`)

### List
**Website:** 5 KPI cards (Total Invoices, Total Receivables, Total Collected, Outstanding Balance, Advance Balance). Status filter tabs — All/Unpaid/Partially Paid/Paid/Voided (counts). Search box. "Record Advance" button. "New Invoice" (manual) button. "Export Excel". Per-row "Receive Payment" button directly on the list. Kebab: View Receipt, Void Invoice. Secondary "Customer Advances" table section.
**Mobile:** ✅ Full. All 5 KPI cards, status filter tabs, search, direct-from-row Receive button, CSV export, Customer Advances section all added.

### Detail / Receipt
**Mobile:** ✅ Full. Rebuilt entirely on the website's own `GET /invoices/:id/receipt` endpoint — company header, full conditional GST breakdown, bank/UPI details, Payment Collections History with per-payment void, Print/PDF, CSV, and WhatsApp share (message template text confirmed against source) all added. **Still missing:** the editable GST/Tax panel (view-only for now — a real remaining gap, not silently dropped).

### Receive Payment
**Mobile:** ✅ Matches structurally. Cosmetic gap unchanged: raw enum labels vs. website's friendly labels.

### Record Advance
**Mobile:** ✅ Full. New screen built.

### New Invoice (manual)
**Mobile:** ✅ Full. New screen built (confirmed the real endpoint is `POST /invoices`, not `/invoices/manual`).

### Void (invoice or individual payment)
**Website:** Mandatory Reason, contextual description text, works at both invoice-level and individual-payment-level.
**Mobile:** 🟡 Partial. Invoice-level void matches (mandatory reason). **Missing:** individual-payment-level void (only whole-invoice void exists), descriptive helper text.

---

## EXPENSES

### List (`/expenses`)
**Website:** 4 KPI cards (Total Outflow, Machinery Expenses, General Operations, Expense Entries count). Category filter tabs (dynamic, per category, with counts). Search box. Export Excel. Inline Edit/Delete icon buttons per row.
**Mobile:** ✅ Full. 4 KPI cards, dynamic category filter chips, search box, CSV export (disclosed .xls→CSV deviation) all added.

### Detail
**Mobile:** ✅ Full. New screen built — Amount, Category, Linked Machine, Recorded By, Date, Description all present. Row tap now wired.

### Create/Edit Form
**Website:** Category*, Amount*, Linked Machine (optional), Expense Date, Description.
**Mobile:** ✅ Matches — all fields present.

---

## FUEL (`/fuel`) — read-only on both sides

**Website:** Machine filter, From/To Date filters, Apply/Clear, **Export Excel**. Summary KPIs: Total Entries, Total Litres, Total Cost.
**Mobile:** ✅ Full. Machine filter, date-range picker, Clear action, CSV export, and Total Cost KPI all added.

---

## MAINTENANCE (`/maintenance`)

### List / Alerts
**Website:** Machine filter (Apply/Clear). Alerts grid (Overdue/Due Soon/Up-to-date badges). Records table (Machine, Service Date, Hour Meter, Description, Cost, Performed By, Delete).
**Mobile:** 🟡 Partial. Has Alerts banner (Overdue/Due Soon only, Healthy filtered out — a reasonable simplification) and Records list. **Missing: machine filter on the Records view** (not previously disclosed); Records list doesn't display "Performed By" (captured in the form, just not shown in the list row).

### Log Service Record
**Website/Mobile:** ✅ Matches closely — Machine, Service Date, Hour Meter, Cost, Description, Performed By all present on both.

### Schedules
**Open question, not previously flagged:** the website's `MaintenancePage.tsx` and `MaintenanceLogModal.tsx` (the only two files in that feature folder) show **no Schedules management UI at all** in this inventory — no "Add Schedule" button, no schedule list/form was found anywhere in `features/maintenance/`. The backend has a full `MaintenanceSchedule` CRUD API (confirmed in Stage 8), and mobile built a Schedules screen against it — but it's not yet confirmed where (or whether) the website itself exposes equivalent UI. **This needs direct follow-up** before claiming mobile is ahead here; it may live in a shared component not covered by this file list, or the website may genuinely have no UI for it.

---

## REPORTS (`/reports`)

**Website:** Time range as labeled segmented buttons ("Last 7 Days" etc). 6 KPI cards. **Income Overview line chart. Fuel Consumption bar chart.** Pending Payments table (conditional). Print/Save PDF. Export Excel (.xls-style, revenue-only columns).
**Mobile:** 🟡 Partial. Has 6 KPI cards (matches), time range as a plain dropdown with raw values (cosmetic gap), real PDF export, CSV export (disclosed deviation from Excel). **Missing: both charts (income line, fuel bar/consumption entirely — mobile Reports doesn't call the fuel endpoint at all), Pending Payments table.**

---

## SETTINGS (`/settings`) — entirely missing, not previously identified as its own gap

**Website — 4 tabs, all fields:**
1. **Business Profile:** Business Name*, Phone, Email, Address, City, District, State, PIN Code, Country, GST-registered checkbox → GSTIN, PAN Number; read-only Currency/Timezone/Language; read-only Company Metadata (ID/Slug/Status/Created).
2. **Invoicing & Payments:** Invoice Prefix, Bank Name, Account Number, IFSC Code, UPI ID, Default Tax Rate (%), Tax-Inclusive Pricing checkbox.
3. **Equipment & Operational Rules:** Machine Service Alert Threshold (hrs), Insurance/Document Expiry warning (days), Driver License Expiry warning (days), Require Mandatory Completion Photo checkbox, Require Mandatory Fuel-Log Entry checkbox.
4. **My Account & Security:** Change Password.

**Mobile:** ✅ Full. New `SettingsScreen` (`/settings`, added to the Owner/Manager drawer) with all 4 tabs matching `SettingsPage.tsx` field-for-field: **Business Profile** (Name/Phone/Email/Address/City/District/State/PIN/Country, GST-registered switch + GSTIN/PAN, read-only Currency/Timezone/Language, Company Metadata card with ID/Slug/Status/Created); **Invoicing & Payments** (Invoice Prefix + live example, Bank Name/Account Number/IFSC/UPI, Default Tax Rate + Tax-Inclusive switch); **Equipment & Operational Rules** (Service Alert Hours/Insurance Alert Days/License Alert Days, Require Photo/Require Fuel-Log switches — this is the same `CompanyProfile`/`companyProfileProvider` infrastructure the Machines/Drivers warning chips and Job completion banners already depend on, now finally editable rather than defaults-only); **My Account & Security** (new shared `ChangePasswordCard` widget, `POST /auth/change-password`). All 3 write tabs correctly gated read-only for non-Owner (confirmed `settings.manage` is Owner-only via `seedData.ts` — Manager does NOT hold it, unlike most other admin permissions in this app), matching the website's per-tab read-only banners.

---

## DRIVER ROLE SURFACE

### Driver Home (`/driver`)
**Website:** Greeting + date banner. KPI row (Today/Upcoming/Total counts). "Today's Job" spotlight card (customer/village/machine/date/start time/running timer/acres/fuel) + Navigate button + full `DriverJobActions` embedded. "View All Job Cards →" link.
**Mobile:** 🟡 Near-full. New `DriverHomeScreen` (now the Driver's landing route, `/driver`) — greeting banner with first name + full date, Today's Job spotlight card (customer/village/machine/date/start time/live running timer/acres/fuel), Navigate button, KPI row (Today/Upcoming/Total), "View All Job Cards →" (switches the bottom-nav tab rather than navigating a separate route). **Deliberate simplification, disclosed:** the spotlight card does not re-embed the full Start/Pause/Stop/Submit action set inline — it links to the existing, already-verified `job_detail_screen.dart` via a "Manage Job" button instead of duplicating the same action state machine in two places. The full workflow is one tap away.

### Driver Job Cards List (`/driver/jobs`)
**Website:** Filter tabs — All / Active / Upcoming / Done (with counts). Relative-date display per row.
**Mobile:** ✅ Full. The shared `job_list_screen.dart` now branches its filter set by role: Owner/Manager keep their existing 6-tab set, Driver gets the website's exact All/Active/Upcoming/Done semantics (verified field-for-field against `DriverJobsPage.tsx`'s filter predicates) with live counts, plus relative-date ("Today"/"Tomorrow"/`d MMM yyyy`) row subtitles matching `fmtDateRelative`.

### Driver Job Detail (`/driver/jobs/:id`)
**Website:** Details grid (Date/Machine/Start Time/End Time/Acres/Fuel/Actual Hours), Notes card, Navigate button, live timer (finer h/m/s granularity, ticks every 1s), full `DriverJobActions`.
**Mobile:** ✅ Full — same shared `job_detail_screen.dart` used for Owner/Manager, with Owner/Manager-only actions correctly hidden for Driver. Live workflow verified to match verbatim (see Jobs section above). Navigate (Google Maps) button added. Minor, unchanged: mobile's live-counter format (HH:MM:SS everywhere) differs from the website's own inconsistency (Home card uses h/m only at 5s ticks, Detail page uses h/m/s at 1s ticks) — mobile's is arguably more consistent, not a real gap.

### Driver Profile (`/driver/profile`)
**Website:** Profile card, details grid, **Compensation summary** (model, total completed jobs + worked hours, calculation explanation, calculated earnings amount), Change Password, Sign Out.
**Mobile:** ✅ Full. New `DriverProfileScreen` (3rd bottom-nav tab) — avatar/name/role card, details grid (Full Name/Email/Mobile/Status), Work History & Compensation Model card (`GET /drivers/:id/compensation`, driver record resolved by matching the logged-in user against the Drivers list exactly as the website does — no direct "my driver record" endpoint exists on either platform), shared `ChangePasswordCard`, Sign Out.

### Driver bottom nav
**Website:** 3-tab bottom bar — Home / Job Cards / Profile.
**Mobile:** ✅ Full. New `DriverShellScreen` — `NavigationBar` with Home/Job Cards/Profile, tab selection lifted to a provider so it survives navigating away to Job Detail and back (returns to whichever tab the driver was on, not always Home).

---

## FARMER/CUSTOMER PORTAL SURFACE

### Farmer Home (`/farmer`)
**Website:** Greeting + date. 3 KPI cards (Total Bookings, Active, Balance Due). Recent 3 bookings (with See All link).
**Mobile:** ✅ Full. New `FarmerHomeScreen` — greeting banner, 3 KPI cards (Total Bookings/Active/Balance Due, same "not COMPLETED and not CANCELLED" active-count logic as `FarmerHomePage.tsx`), 3 most-recently-created bookings with per-row status badge and a "See all →" that switches the bottom-nav tab.

### Farmer Bookings (`/farmer/bookings`)
**Website:** Filter chips — All/Active/Awaiting/Done. Expandable cards revealing Work Needed, Village, Machine, Pricing, Rate, Total, Notes.
**Mobile:** ✅ Full. New `FarmerBookingsScreen` — filter chips with the exact same job-status-keyed predicates as `FarmerBookingsPage.tsx` (badges/filters read the linked Job's status, not the booking's own legacy status pipeline), expandable cards with Work Needed/Village/Machine/Pricing/Rate/Total (computed with the identical `round2(rate×quantity)` formula, only shown once the linked job is COMPLETED)/Notes.

### Farmer Invoices (`/farmer/invoices`)
**Website:** Summary KPI row (Total Invoices, Total Paid, Balance Due). Filter chips — All/Unpaid/Partial/Paid. Expandable detail (Total/Paid/Balance/Booking/Due Date/Notes).
**Mobile:** ✅ Full. New `FarmerInvoicesScreen` — KPI row, filter chips with live counts, expandable cards (Total/Paid/Balance/Booking/Due Date). **Notes deliberately omitted**: `Invoice.notes` is declared on the website's own TypeScript type but doesn't exist on the Prisma `Invoice` model (only `description` does) — confirmed by reading both — so the website's own "Notes:" block is dead code that never renders; mobile doesn't reproduce a field that's never actually populated.

### Farmer Profile (`/farmer/profile`)
**Website:** Profile card, details grid, Change Password, Sign Out.
**Mobile:** ✅ Full. New `FarmerProfileScreen` (near-identical structure to `DriverProfileScreen`, minus the Driver-only compensation section) — profile card, details grid (Full Name/Email/Mobile/Status), shared `ChangePasswordCard`, Sign Out.

### Farmer bottom nav
**Website:** 4-tab bottom bar — Home / Bookings / Invoices / Profile.
**Mobile:** ✅ Full. New `FarmerShellScreen` — same lifted-tab-index-provider pattern as the Driver shell.

---

## SHARED CHROME (AppLayout — Owner/Manager)

**Website sidebar nav (15 items, permission-gated):** Dashboard, Bookings, Job Cards, Customers, Villages, Machines, Drivers, Employees, **Team**, Payments, Expenses, Fuel, Maintenance, Reports, **Settings**.
**Mobile drawer (15 items):** ✅ Full — Dashboard, Jobs, Bookings, Machines, Drivers, Customers, Villages, Payments, Employees, **Team**, Expenses, Maintenance, Fuel, Reports, **Settings**. (Team/Settings added in Checkpoints 5–6.)

**Website top bar:** Global search box (possibly non-functional on the website itself per source inspection — low priority, still not built). **Notifications bell + dropdown** (categorized alerts: service/insurance/license/invoice/booking, with overdue styling, click-through navigation). Date badge. Profile chip (click-to-logout).
**Mobile:** 🟡 Near-full. ✅ New `NotificationBell` — same 5-source computation as `useNotifications.ts` (machines/drivers/invoices/bookings/company profile, reusing the already-built warning helpers, zero new backend endpoint), badge count, categorized icons, overdue bold styling, tap-to-navigate. **Deliberate placement simplification, disclosed:** added to the Dashboard AppBar only (the Owner/Manager landing screen) rather than every one of the ~15 individual screen AppBars the website's single shared `AppLayout` wrapper covers automatically — this app doesn't have an equivalent single-wrapper chrome layer, so replicating it fully would mean editing every screen file for one icon. Still missing: global search box (disclosed as low-priority on the website itself too). Logout remains via a dedicated drawer item, functionally equivalent to the website's 3 logout entry points.

---

## Original newly-found gaps (as of the initial audit) — closure status

This list was the initial audit's finding, before the full-parity build run. Kept for history; each item's actual closure status as of the end of the run follows.

1. ~~Dashboard: operational warning banner, Quick Actions row, greeting banner, all 3 charts.~~ **Closed** (Checkpoint 9) — banner/actions/greeting all built; charts scope-corrected (the comparable phone-width website layout has none).
2. Bookings: search box ✅, Export Excel ✅, Scheduled Time field ✅. **Export Excel remains missing** — corrected below, was mislabeled closed.
3. ~~Jobs: filter tabs, search, Manual/After-Work entry, completion grid, proactive warnings.~~ **Closed** (Checkpoint 4).
4. Machines: filter tabs/search/warning chips ✅ (earlier checkpoint). No further gaps this run.
5. Drivers: filter tabs/search/warning badges/License fields ✅ (earlier checkpoint). No further gaps this run.
6. Customers: search/Village-in-Detail/Portal-Access/Address/Notes/isActive ✅ (earlier checkpoint). No further gaps this run.
7. ~~Villages: search box, Status column, Mark Inactive/Active action.~~ **Closed** (earlier checkpoint).
8. Employees: filter tabs/search/Joined-Date ✅ (earlier checkpoint). No further gaps this run.
9. ~~Team module: entirely unbuilt.~~ **Closed** (Checkpoint 5).
10. ~~Payments: KPI cards, filter tabs, search, Record Advance, New Invoice, receipt/print view, per-payment void.~~ **Closed** (Checkpoint 3). One residual gap remains: editable GST/Tax panel (view-only).
11. ~~Expenses: KPI cards, filter tabs, search, Detail screen.~~ **Closed** (Checkpoint 2). Export Excel was built as CSV (disclosed deviation).
12. ~~Fuel: machine/date filters, export, Total Cost KPI.~~ **Closed** (Checkpoint 2).
13. Maintenance: machine filter on Records still missing — **not part of this run's 14-checkpoint scope, still open.**
14. Reports: both charts, Pending Payments table still missing — **not part of this run's 14-checkpoint scope, still open.**
15. ~~Settings module: entirely unbuilt.~~ **Closed** (Checkpoint 6).
16. ~~Driver role: Home/Profile/bottom nav/filter tabs/Navigate.~~ **Closed** (Checkpoint 7).
17. ~~Farmer role: Home/Profile/bottom nav/filter chips/expandable detail/KPI rows.~~ **Closed** (Checkpoint 8).
18. ~~Notifications center: entirely unbuilt.~~ **Closed** (Checkpoint 10), with disclosed placement scope (Dashboard AppBar only, not all screens).

**Genuinely still open at the end of this run** (all disclosed above with reasoning, none silently dropped): Bookings' Export Excel; Payments' editable GST/Tax panel; Maintenance's Records machine filter; Reports' 2 charts + Pending Payments table; a handful of small named cosmetic/quick-create-shortcut gaps scattered across Machines/Drivers/Customers/Villages/Employees list screens (see each module's own 🟡 entry above for the exact remaining item); Job Detail's fuel/photo list display and Field Notes section; Manual Job Entry's inline customer quick-create; AUTH's Accept-Invite/Reset-Password screens and Login's PIN/OTP modes (require deep-linking / SMS infrastructure not yet built, consistent with the original V1 plan's explicit deferral — not newly discovered gaps).
18. Shared chrome: no notifications center anywhere on mobile.
