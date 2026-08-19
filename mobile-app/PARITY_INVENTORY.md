# ShabooAgri Mobile — Exhaustive Screen & Field Parity Inventory

Produced by reading the entire website source (`frontend/src`) file by file — every `.tsx` in `features/`, plus `app/App.tsx` (route list) and `layouts/`. Mobile-side status is drawn from direct knowledge of the mobile app's actual current source (built this session), not from memory of the earlier module-level audit. Status legend: **✅ Full** / **🟡 Partial (gaps named)** / **🔴 Not Started** / **N/A** (doesn't apply to mobile, e.g. desktop-only admin flows).

---

## AUTH

### Login (`/login`)
**Website fields:** Mode tabs — Password / Quick PIN / Mobile OTP. Identifier field (all modes). Password mode: Password field, "Forgot password?" link. PIN mode: 4-digit PIN field. OTP mode: pre-send info text → post-send OTP code field, dev-OTP alert.
**Website buttons:** Submit ("Request OTP" / "Log In"), Forgot Password modal (Email field, Cancel/Send Reset Link, success state with Close).
**Mobile:** 🟡 Partial. Has Identifier + Password fields and a Login button — matches Password mode only. **Missing:** PIN mode, OTP mode, mode tabs entirely, Forgot Password link/flow.

### Accept Invite (`/accept-invite`)
**Website:** Name (read-only), Password, Confirm Password fields; Activate Account button; token-validation states.
**Mobile:** 🔴 Not Started. No screen exists.

### Reset Password (`/reset-password`)
**Website:** Request mode (Email field) and Confirm mode (New Password, Confirm New Password), token validation.
**Mobile:** 🔴 Not Started. No screen exists.

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

**Mobile app:** 🟡 Partial.
- ✅ Has: 6 KPI cards (Today's Revenue, This Month, Pending Collection, Machines Working, Drivers Active, Jobs Completed) with correct delta logic. Today's Job Cards list with correct Ready-to-Start/Awaiting-Machine badge logic. Pending Payments list. "VIEW ALL JOBS" button.
- 🔴 Missing entirely: Income Overview chart, Machine Status donut, Fuel Consumption chart (all three — same gap as before, now confirmed against literal website content). Greeting/date banner. 4-button Quick Actions row. Operational warning banner (Service/Insurance/License alerts) — **this is a real, previously-unflagged gap**, not disclosed in the build log.
- No "View All Invoices" direct link (payments reachable via drawer only).

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
**Mobile:** 🔴 **Not Started as a distinct screen.** Mobile's Driver role lands directly on the flat Job List — there is no Home screen with a greeting, KPI counts, or a spotlighted "today's job" card.

### Driver Job Cards List (`/driver/jobs`)
**Website:** Filter tabs — All / Active / Upcoming / Done (with counts). Relative-date display per row.
**Mobile:** 🟡 Partial. Has the list. **Missing: all 4 filter tabs**, relative-date formatting (mobile shows raw status text).

### Driver Job Detail (`/driver/jobs/:id`)
**Website:** Details grid (Date/Machine/Start Time/End Time/Acres/Fuel/Actual Hours), Notes card, Navigate button, live timer (finer h/m/s granularity, ticks every 1s), full `DriverJobActions`.
**Mobile:** ✅ Close match — this is the same shared `job_detail_screen.dart` used for Owner/Manager, with Owner/Manager-only actions correctly hidden for Driver. Live workflow verified to match verbatim (see Jobs section above). **Missing: "Navigate" (Google Maps) button.** Minor: mobile's live-counter format (HH:MM:SS everywhere) differs from the website's own inconsistency (Home card uses h/m only at 5s ticks, Detail page uses h/m/s at 1s ticks) — mobile's is arguably more consistent, not a real gap.

### Driver Profile (`/driver/profile`)
**Website:** Profile card, details grid, **Compensation summary** (model, total completed jobs + worked hours, calculation explanation, calculated earnings amount), Change Password, Sign Out.
**Mobile:** 🔴 **Not Started.** No Driver Profile screen exists at all — no compensation/earnings view, no in-app sign-out for Driver specifically (logout only reachable via the Job List's AppBar icon), no change-password.

### Driver bottom nav
**Website:** 3-tab bottom bar — Home / Job Cards / Profile.
**Mobile:** 🔴 Not Started — no bottom nav for Driver role at all (single flat screen).

---

## FARMER/CUSTOMER PORTAL SURFACE

### Farmer Home (`/farmer`)
**Website:** Greeting + date. 3 KPI cards (Total Bookings, Active, Balance Due). Recent 3 bookings (with See All link).
**Mobile:** 🔴 Not Started as a distinct screen — mobile's Farmer surface is one combined Bookings+Invoices list with no Home/greeting/KPI/recent-3 view.

### Farmer Bookings (`/farmer/bookings`)
**Website:** Filter chips — All/Active/Awaiting/Done. Expandable cards revealing Work Needed, Village, Machine, Pricing, Rate, Total, Notes.
**Mobile:** 🟡 Partial. Has a flat bookings list (booking number, status, date, amount). **Missing: filter chips, expandable detail panel** (Work Needed, Machine, Pricing/Rate, Total, Notes are not shown anywhere).

### Farmer Invoices (`/farmer/invoices`)
**Website:** Summary KPI row (Total Invoices, Total Paid, Balance Due). Filter chips — All/Unpaid/Partial/Paid. Expandable detail (Total/Paid/Balance/Booking/Due Date/Notes).
**Mobile:** 🟡 Partial. Has a flat invoice list (number, status, balance). **Missing: KPI row, filter chips, expandable detail panel.**

### Farmer Profile (`/farmer/profile`)
**Website:** Profile card, details grid, Change Password, Sign Out.
**Mobile:** 🔴 Not Started as a distinct screen (logout only via AppBar icon on the combined list screen).

### Farmer bottom nav
**Website:** 4-tab bottom bar — Home / Bookings / Invoices / Profile.
**Mobile:** 🔴 Not Started — no bottom nav for Farmer role (single combined screen).

---

## SHARED CHROME (AppLayout — Owner/Manager)

**Website sidebar nav (15 items, permission-gated):** Dashboard, Bookings, Job Cards, Customers, Villages, Machines, Drivers, Employees, **Team**, Payments, Expenses, Fuel, Maintenance, Reports, **Settings**.
**Mobile drawer (13 items):** Dashboard, Jobs, Bookings, Machines, Drivers, Customers, Villages, Payments, Employees, Expenses, Maintenance, Fuel, Reports.
**Gap:** Missing **Team** and **Settings** drawer entries — consistent with those modules being entirely unbuilt.

**Website top bar:** Global search box (possibly non-functional on the website itself per source inspection — low priority). **Notifications bell + dropdown** (categorized alerts: service/insurance/license/invoice/booking, with overdue styling, click-through navigation). Date badge. Profile chip (click-to-logout).
**Mobile:** 🔴 No notifications center anywhere. No global search. Logout via a dedicated drawer item (functionally equivalent, structurally simpler than the website's 3 logout entry points).

---

## Summary of newly-found gaps not previously disclosed in BUILD_LOG.md

1. Dashboard: operational warning banner (service/insurance/license), Quick Actions row, greeting banner, all 3 charts.
2. Bookings: search box, Export Excel, Scheduled Time field, photo attachments in Detail.
3. Jobs: all list filter tabs, search box, Manual/After-Work job entry flow entirely, completion summary grid with Total, proactive missing-photo/fuel warnings.
4. Machines: list filter tabs + search + warning chips, Detail's KPI row/service-due/insurance/purchase-year, form's Assigned Driver + Purchase Year fields.
5. Drivers: list filter tabs + search + warning badges, **License Number/Expiry missing from Detail**, License Expiry missing from the form.
6. Customers: search box, **Village missing from Detail** (inconsistent with the List, which does show it), Portal Access, Address/Notes in Detail, isActive toggle.
7. Villages: search box, Status column, and the **entire Mark Inactive/Active action** — missing outright.
8. Employees: list filter tabs + search, Detail's Joined Date/System Account, form's Joined Date field.
9. **Team module: entirely unbuilt**, not identified in any prior audit.
10. Payments: all 5 KPI cards, filter tabs, search, Record Advance (whole feature), New Invoice (manual), Export Excel, the **entire receipt/print view**, per-payment void.
11. Expenses: KPI cards, filter tabs, search, Export Excel, and the **entire Detail screen (row tap does nothing)**.
12. Fuel: machine/date filters, Export Excel, Total Cost KPI.
13. Maintenance: machine filter on Records; open question on whether Schedules has a website UI at all.
14. Reports: both charts, Pending Payments table.
15. **Settings module: entirely unbuilt** — and is the root data source for several "missing warning" gaps above.
16. **Driver role: no Home screen, no Profile/compensation screen, no bottom nav, no filter tabs on Job List, no Navigate button.**
17. **Farmer role: no Home screen, no Profile screen, no bottom nav, no filter chips or expandable detail on either Bookings or Invoices, no KPI rows.**
18. Shared chrome: no notifications center anywhere on mobile.
