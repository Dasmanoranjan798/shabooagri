# Mobile App — Full Parity Build Log

Continuous autonomous run across all 9 stages of the approved parity plan (audit + plan delivered 2026-08-18). No production deploy, no Play Store submission — those remain explicit separate approvals. This log is appended after each stage completes, not used as a pause point.

---

## Pre-Stage-1: Critical bug found — release APK missing INTERNET permission

Before writing any Stage 1 code, checked the actual merged manifest of the last release build (`build/app/intermediates/merged_manifests/release/.../AndroidManifest.xml`) rather than trusting a green `flutter build apk --release`. Found it declares `ACCESS_NETWORK_STATE` (from `connectivity_plus`) but **no `INTERNET` permission at all**.

Root cause: Flutter's stock project template only adds `<uses-permission android:name="android.permission.INTERNET"/>` to `android/app/src/debug/AndroidManifest.xml` and `src/profile/AndroidManifest.xml` — never to `src/main/AndroidManifest.xml`, which is the only one release builds merge. This has been true since the very first `flutter build apk --release` in this project (before today's session too) and was never caught because no release build had been installed on a real device yet.

**Impact: both v0.2.0 and v0.3.0 release APKs already shipped to shabooagri.com/app today are completely non-functional on a real device** — Android blocks all network sockets without this permission at the OS level, regardless of what the app code does. Company Setup, login, every screen — all would fail immediately. Not deployed to Play Store, so no live users were affected, but this would have been caught by the user's first real-device test of the release build (which per their last message, hadn't happened yet — good timing).

**Fix:** added `<uses-permission android:name="android.permission.INTERNET"/>` to `android/app/src/main/AndroidManifest.xml`. Also added `<uses-permission android:name="android.permission.CAMERA"/>` proactively, needed for Stage 1's photo-capture feature.

This is exactly the class of bug the user asked to be re-checked for (schema drift / silent gaps), just in build config rather than Dart code — confirms the self-test discipline needs to include inspecting actual build output, not just source.

---

## Stage 1: Job Card live workflow parity

**Built:**
- `lib/features/jobs/data/job_detail.dart` — rich `JobDetail` model parsed from `GET /jobs/:id`'s full relations (booking → customer/village/pricingMethod, machine, driver → employee), replacing the flat offline `OfflineJob` for the Detail screen. List screen is unchanged (still offline-cached, matches website's own list not needing live pricing).
- `lib/features/jobs/data/job_actions_repository.dart` — direct online calls for start/pause/resume/stop/submit/cancel/addFuelEntry/addPhoto/updateNotes.
- `lib/features/jobs/presentation/job_detail_screen.dart` — full rewrite: live ticking HH:MM:SS counter (client-side `Timer.periodic`, matches the website's wall-clock-minus-paused formula exactly), live price (`rate × elapsed`) for hour/minute-rated jobs, dynamic Pause/Start button, separate Stop button, mandatory pause-reason dialog on Resume (with the same three quick-reason chips), two-step Stop→Submit confirmation using the **exact verbatim text** from the website (`"Once submitted, this job cannot be changed by a Manager or Driver. Only the Owner can edit it after this point."` etc.), Owner-only Cancel Job action, and Add Fuel / Add Photo / Add Note quick actions for Owner/Manager only (Driver doesn't get these, matching the website's `DriverJobActions` scope exactly).
- `lib/core/network/api_error.dart` — shared helper to surface the backend's real `{error: "..."}` message instead of a generic failure text; will reuse this in every remaining stage.
- Added `image_picker` (photo capture) and `intl` (date formatting, needed by later stages) to `pubspec.yaml`.

**Deviation from pure offline-first, disclosed:** Job lifecycle actions (start/pause/resume/stop/submit/cancel/fuel/photo/note) now call the API directly instead of going through the offline `SyncQueue` (removed the now-superseded `updateJobStatusOffline` from `job_repository.dart`). Reason: these actions carry real business rules (mandatory pause-reason, the locked-after-submit rule, automatic invoice generation) that only the server can enforce — queuing them for later replay would show a driver a false "success" for an action that might get rejected once it actually reaches the server. The website itself has no offline mode for this either. Actions now require connectivity and show a real error (via `apiErrorMessage`) if offline, rather than silently pretending to succeed.

**Critical bug found and fixed:** see the "Pre-Stage-1" entry above — the release APK's missing `INTERNET` permission would have made 100% of this stage (and everything shipped today) non-functional on a real device. Verified fixed by running the Gradle manifest-merge task directly and confirming `INTERNET`/`CAMERA` now appear in the actual release-variant merged manifest, not just trusting a green build.

**Self-test:**
- `flutter analyze`: 0 errors (1 cosmetic info-level lint left as-is, harmless).
- `flutter test`: passes.
- Live-curled all 9 new endpoint paths (`/jobs/:id`, `/start`, `/pause`, `/resume`, `/stop`, `/submit`, `/cancel`, `/fuel-entries`, `/photos`) against `pilot.shabooagri.com` — all return 401 (auth-gated), none 404, confirming every route path is real with no typos.
- Cross-referenced every field in `JobDetail.fromJson` against `job.repository.ts`'s actual `includeRelations` shape and `job.validators.ts`'s exact request schemas (not guessed) before writing the parsing code.
- Traced the paused-time display precisely against `job.service.ts`'s `currentPauseDurationSec`/`resume()` logic — see known gap below.

**Known gap, disclosed rather than silently shipped:** the backend has no endpoint exposing `JobStatusLog` (the source of truth for exactly when the current pause began), so mobile cannot compute the *exact* frozen elapsed time if the Detail screen is opened well after a pause already started (it recomputes using `totalPausedDurationSec`, which the server only finalizes at `resume()` time, not while still paused) — the displayed number can be a few seconds/minutes off if you leave a job paused and reopen the screen much later, self-correcting the moment you resume or check again soon after pausing. This is a data-availability limitation, not a bug I can fix from the client; flagging it rather than pretending exact precision. Not present while WORKING (that calculation is always exact) or once STOPPED/COMPLETED (uses the server's final `actualHours`).
- Also not built in this stage, disclosed: no in-app listing of existing fuel entries/photos on a job (only adding new ones) — the website's `JobExecutionModal` shows a running list; mobile only adds, doesn't display what's already logged. Low-risk omission (data is still real and visible in Payments/Reports), noted for a future pass if wanted.

---

## Stage 2: Dashboard real KPIs

**Built:**
- `lib/features/dashboard/data/dashboard_summary.dart` — models mirroring `GET /dashboard/summary`'s exact response shape (field-for-field from `dashboard.service.ts`, not guessed).
- Rewrote `dashboard_screen.dart`: 6 real KPI cards (Today's Revenue, This Month, Pending Collection, Machines Working, Drivers Active, Jobs Completed, each with the real day-over-day delta the backend computes), Today's Job Cards list (tappable → Job Detail), Pending Payments list (tappable → the existing Payment Detail screen from the previous session). Replaces the old client-side "count locally-synced jobs" placeholder entirely — zero backend work needed, exactly as the audit predicted.

**Deviation, disclosed:** the website's Dashboard also has an Income Overview line chart, a Machine Status donut chart, and a Fuel Consumption bar chart (from `/dashboard/income` and `/dashboard/fuel`). Built the KPI numbers and both list sections (higher information value per screen space on a phone), but skipped the chart widgets themselves for this stage — charting is a real, separate UI investment on mobile and the plan sized this stage as fast/small on the assumption it was mostly backend-reuse. Numbers behind the charts are real and available (`machinesWorking.working/activeUsable` etc. already surfaced), just not plotted as line/bar/donut visuals yet. Flagging rather than silently shipping a "done" that isn't full visual parity.

**Self-test:**
- `flutter analyze`: 0 errors.
- Live-curled `/dashboard/summary`, `/dashboard/income?range=30d`, `/dashboard/fuel?range=30d` against `pilot.shabooagri.com` — all 401 (auth-gated), confirming real, correctly-pathed endpoints.
- Cross-checked every parsed field name against the actual `getSummary()`/`buildDelta()`/`mapJobRow()` backend source, not the website's TS types (backend is the ground truth for JSON keys).

---

## Stage 3: Villages/Machines/Drivers/Customers full CRUD

**Built, all four entities:**
- Create/Edit form screens (`village_form_screen.dart`, `machine_form_screen.dart`, `driver_form_screen.dart`, `customer_form_screen.dart`), fields read directly from each backend Zod validator (`createXSchema`), not guessed.
- Kebab (⋮) menu on every list row: **Edit** gated to Owner/Manager (`isOwnerOrManager`), **Delete** gated to Owner only (`roleSystemKey == 'owner'`) — mirrors the real `*.manage` vs `*.delete` permission split confirmed in the parity audit. Server still enforces the real permission regardless of client-side gating (defense in depth, not the only check).
- FAB "+" on each list screen (Owner/Manager only) to create.
- `lib/core/widgets/confirm_delete.dart` — shared confirm-then-delete flow that surfaces the backend's real dependency-guard 409 message (e.g. "Cannot delete this machine — N bookings reference it.") in a dialog, same reactive pattern the website uses via `alert()`, just in a proper dialog.
- Edit screens for Machine/Driver/Customer fetch the full live record via `GET /:id` rather than prefilling from the (partial) local offline cache — avoids showing stale or incomplete data in the form.

**Deviations, disclosed:**
- **Machine form**: built the core fields (type, registration, brand/model, status, hour meter) but not insurance number/expiry or the service-schedule fields (next-service-due hours, last-service date/hour-meter) — those belong to Maintenance data and will get proper UI in Stage 8, not duplicated here.
- **Driver form**: only supports linking to an *existing* Employee (dropdown), not the website's second mode of creating a brand-new Employee inline — that requires the Employee create form, which doesn't exist yet until Stage 6. Sequencing gap, not a missing feature; will naturally close once Stage 6 lands.
- **Customer form**: built the core fields (name, village, phone, address, GST toggle+GSTIN, notes) but not the website's optional "send Farmer portal invite" sub-flow — treated as a distinct feature from core Customer data, same reasoning as Employees' invite flow being its own stage (6).
- Village/Customer forms reuse the "quick-create a new Village inline" *data* (both can pick from the full live Villages list) but not the website's inline quick-create-village-from-within-the-form widget — user creates a Village first via the Villages screen, then picks it. Slightly more taps, same end state, real data throughout.

**Self-test:**
- `flutter analyze`: 0 errors (found and fixed one real bracket-mismatch bug caught by analyze during the Machine form's refactor to fetch live data for Edit — not shipped).
- `flutter test`: passes.
- Live-curled all 17 new endpoint paths (Villages/Machines/Drivers/Customers × GET/POST/PATCH/DELETE, plus `/machine-types`) against `pilot.shabooagri.com` — all 401, none 404.
- Cross-checked every request-body field against the real `createXSchema`/`updateXSchema` Zod validators (not the frontend's TS types) — e.g. confirmed `Driver.availabilityStatus` enum is exactly `AVAILABLE | ON_JOB | OFF_DUTY` (not the placeholder values the original Stage 2 offline table comment guessed), confirmed `Machine.brand`/`model` are optional strings matching the nullable-column fix from the previous session.

---

## Retroactive Stage 1 gap fix: pricing assignment

While reading `booking.validators.ts` for Stage 4, found that pricing (`pricingMethodId`/`rate`) is deliberately left unset at booking creation and only assigned "right before Start" via a dedicated `PATCH /bookings/:id/pricing` endpoint (gated by `job.update_status`, not `booking.edit` — it's part of the Job flow, not booking editing). Stage 1's Job Detail screen never built this step. Left as-is, **the Start button I shipped in Stage 1 would 400 on essentially every real booking** (`"Set a pricing method and rate before starting this job"`), since pricing is optional/unset by default.

Fixed by adding a "Set Pricing" dialog to `job_detail_screen.dart` (pricing-method dropdown from `GET /pricing-methods` + rate field), shown instead of the Start button whenever `job.rate == null` on a NOT_STARTED job. Verified live: `GET /pricing-methods` and `PATCH /bookings/:id/pricing` both 401 (real, auth-gated). This is exactly the category of self-test the user asked for — caught by re-reading backend validators while building a *later* stage, not by re-testing Stage 1 in isolation. Flagging that Stage 1 needs re-verification against this fix in the final regression pass, not just trusted as already-done.

---

## Stage 4: Bookings full create/edit/cancel

**Built:**
- `booking_form_screen.dart` — full Create/Edit form: customer, village, work description, scheduled date (date picker), location, estimated hours/acres, machine (optional dropdown), driver (optional dropdown), notes. Fields read directly from `createBookingSchema`/`updateBookingSchema`.
- On Edit, machine/driver assignment goes through their own dedicated endpoints (`PATCH /bookings/:id/machine`, `.../driver`) separately from the main booking PATCH — matches the backend's real separation (`updateBookingSchema` explicitly omits machine/driver; only `machine.assign`/`driver.assign` permissions can change them).
- Kebab menu (Edit/Delete) + FAB on the Bookings list, same pattern as Stage 3.
- "Cancel a booking" is **not** a separate feature — confirmed in the parity audit that `assertBookingDeletable` blocks hard-delete the instant a Job exists (which happens immediately on booking creation), redirecting to "cancel the job instead." Stage 1's Job Cancel action (Owner-only) already *is* the real cancel path. Booking's own Delete kebab action is still wired (for the rare case no Job exists), and will correctly surface that exact redirect message via the shared `confirmAndDelete` dependency-guard handling if someone tries it on a booking that already has a job.

**Deviation, disclosed:** the website's Booking form also has inline "quick-create a new Farmer" and "quick-create a new Village" sub-forms directly inside the Booking dialog. Mobile requires creating those first via their own screens (already built in Stage 3), then selecting them here — more taps, same real data, no separate scope decision needed since Stage 3 already covers full Customer/Village creation.

**Self-test:**
- `flutter analyze`: 0 errors.
- `flutter test`: passes.
- Live-curled all 6 new/changed endpoint paths (`GET/POST /bookings`, `PATCH /bookings/:id`, `PATCH /bookings/:id/machine`, `PATCH /bookings/:id/driver`, `DELETE /bookings/:id`) — all 401, none 404.
- Traced `updateBookingSchema`'s `.omit({machineId, driverId, pricingMethodId, rate})` precisely before deciding to call the assign-machine/assign-driver endpoints separately on Edit, rather than assuming they could go in the same PATCH body (they'd have been silently dropped by the schema if I had).

---

## Stage 5: Payments — Receive Payment + Void

**Built:**
- "Receive Payment" button on Payment Detail (Owner/Manager, hidden once balance is 0 or invoice is voided) — dialog pre-filled with the full balance due, Payment Method dropdown (`CASH`/`UPI`/`BANK_TRANSFER`/`CREDIT`, exact enum from the backend, not "Cash/UPI/Bank Transfer/Cheque" as I'd initially assumed from the audit summary — verified against `payment.validators.ts` directly), optional reference number, optional notes. Partial payments work naturally (amount just needs to be > 0, no requirement to equal the full balance).
- "Void Invoice" button, Owner-only (`isOwner` check), mandatory reason field (button disabled until non-empty) — matches `voidSchema`'s `min(1)` requirement exactly, and the audit's "mandatory reason" note for void actions specifically (distinct from Job's optional cancel reason).
- Both actions refresh the invoice detail and the Payments list on success.

**Self-test:**
- `flutter analyze`: 0 errors.
- `flutter test`: passes.
- Live-curled `POST /invoices/:id/payments` and `POST /invoices/:id/void` — both 401.
- Caught my own assumption error before shipping: initially wrote the void-status check as `status == 'VOID' || status == 'VOIDED'`, then checked the actual `InvoiceStatus` Prisma enum (`UNPAID | PARTIALLY_PAID | PAID | VOIDED`) and removed the non-existent `'VOID'` branch — a real instance of the "don't guess enum values" discipline the user asked for, caught before commit, not after.

---

## Stage 6: Employees full create/edit + invite

**Built:**
- `employee_form_screen.dart` — name, role title, phone, employment status, compensation type with the matching conditional rate field (`hourlyRate`/`monthlySalary`/`yearlySalary`, only the one matching the selected type is sent), joined-date handling. Fields from `createEmployeeSchema`/`updateEmployeeSchema`.
- "Send ShabooAgri Login Invite" toggle, shown only when there's no existing linked user account (`employee.userId == null`) — matches the website's exact `canSendInvite` condition. Reveals Account Role dropdown (`GET /rbac/roles`) + email/phone fields, fires `POST /team/invites` with the just-created/edited `employeeId` after the Employee record itself saves successfully.
- Disclosed the same real limitation the website itself has in the UI text: "SMS delivery not yet connected" on the invite-phone field, rather than implying it works.
- Kebab (Edit/Delete) + FAB, same pattern as Stages 3–5.

**Self-test:**
- `flutter analyze`: 0 errors (2 cosmetic info-lints, same harmless class as Stage 1's).
- `flutter test`: passes.
- Live-curled all 6 endpoints (`GET/POST /employees`, `PATCH/DELETE /employees/:id`, `GET /rbac/roles`, `POST /team/invites`) — all 401.
- Confirmed `POST /team/invites` lives under `/team`, not `/employees` — easy to have guessed wrong given it's triggered from the Employee form; checked `staffInvite.routes.ts`'s actual mount path in `app.ts` rather than assuming.

---

## Stage 7: Expenses module (entirely new)

**Built:** full new module, live-only (no offline table — same reasoning as Payments/Employees: back-office record-keeping, not field-critical). List (category, amount, date, description), Create/Edit form (category dropdown from `GET /expenses/categories`, amount, optional machine dropdown, optional description, date picker), Delete via kebab. Added "Expenses" to the nav drawer.

**Correctly caught a permission-pattern exception before building, not after:** every other entity so far splits Edit (`*.manage`, Manager-accessible) from Delete (separate Owner-only `*.delete` permission). Checked `expense.routes.ts` directly before assuming Expenses followed the same split — it doesn't; Delete is gated by the same `expense.manage` as Create/Edit, no separate `expense.delete` exists in the permission list. Built the kebab menu with Edit+Delete both under the single `canManage` (Owner or Manager) check, not the two-tier `canManage`/`canDelete` pattern used everywhere else. Documented this exception directly in the source comment, not just here, so a future reader doesn't "fix" it to match the other modules incorrectly.

**Self-test:**
- `flutter analyze`: 0 errors.
- `flutter test`: passes.
- Live-curled all 5 endpoints (`GET /expenses/categories`, `GET/POST /expenses`, `PATCH/DELETE /expenses/:id`) — all 401.

---

## Stage 8: Maintenance module (Schedules + Records + Alerts)

**Built:**
- `maintenance_screen.dart` — real-time Service Alerts banner (`GET /maintenance/alerts`, the existing engine, unchanged — status OVERDUE/DUE_SOON/HEALTHY, only non-healthy shown) + Service Records list, matching `MaintenancePage.tsx`.
- `maintenance_record_form_screen.dart` — "Log Service Record" flow: machine, service date, hour meter at service, cost, performed-by, description. Matches `MaintenanceLogModal.tsx`'s fields.
- `maintenance_schedules_screen.dart` — reachable via an AppBar icon rather than the main screen (kept the primary screen focused on Alerts+Records, matching how the website itself treats schedules as secondary config vs. records as the frequent action). Simple in-dialog create/edit (3 real fields: interval hours, interval days, description) rather than a full-screen form — proportionate to the actual field count, same judgment call as Villages in Stage 3.
- Added "Maintenance" to the nav drawer.

**Real bug caught and fixed before shipping, not after:** the Schedules dialog's machine dropdown initially read `ref.read(machinesListProvider)` once at dialog-open time — if that provider hadn't resolved yet (e.g. user navigates straight to Schedules without visiting Machines first), the dropdown would silently render with zero options and no loading indicator, a real "looks broken, isn't obviously why" bug. Fixed by wrapping the dropdown in a `Consumer` that `ref.watch()`s the provider reactively inside the dialog, with proper loading/error states — same category of async-data-in-a-dialog mistake as the earlier `_SetPricingDialog`, caught this time before commit by re-reading my own code rather than after.

**Self-test:**
- `flutter analyze`: 0 errors.
- `flutter test`: passes.
- Live-curled all 9 endpoints (Schedules × GET/POST/PATCH/DELETE, Records × GET/POST/PATCH/DELETE, Alerts × GET) — all 401.
- Cross-checked every field against `maintenance.validators.ts`'s `createScheduleSchema`/`createRecordSchema` and the repository's actual `include` shape for nested `machine`/`schedule` relations, not guessed.

---

## Stage 9: Reports export/print + Fuel view

**Built:**
- `fuel_screen.dart` — read-only, confirmed (not assumed) against `fuel.routes.ts`'s own comment that this is a read-only view; the real write path is only via a Job's own fuel-logging (Stage 1's Add Fuel). No standalone create form exists on the website either, so none built here.
- `reports_screen.dart` — reuses `/dashboard/summary` + `/dashboard/income` (confirmed in the parity audit: the website's own Reports page is a re-presentation of Dashboard's data, not a separate aggregation engine), with a range selector (7d/30d/90d/12m). The genuinely new work: **real PDF export** via `pdf`+`printing` (generates an actual PDF with KPI and income tables, handed to the OS share sheet — user can save, print, or send it) and **CSV export** via `share_plus`.
- Added `pdf`, `printing`, `share_plus` packages plus "Fuel" and "Reports" to the nav drawer.

**Deviation, disclosed:** the website exports `.xls` (XML Spreadsheet format) via `exportUtils.ts`. Mobile exports real CSV instead of replicating that exact format — same underlying tabular data, opens in Excel/Sheets fine, but not byte-identical to the website's file. Chose this over adding a heavier `.xlsx`-writing dependency for a stage the plan itself flagged as uncertain-size; genuinely working, not a stub.

**Two real bugs caught by `flutter analyze`, fixed before commit:**
1. `share_plus: ^10.1.4` resolved to a version whose actual API is the older static `Share.share(text, subject:)`, not the `SharePlus.instance.share(ShareParams(...))` API I wrote from memory of a newer version — analyzer caught `Undefined name 'SharePlus'` immediately; fixed by reading the installed package's actual source (`~/.pub-cache/.../share_plus-10.1.4/lib/share_plus.dart`) rather than guessing again.
2. `pw.Table.fromTextArray` is deprecated in the resolved `pdf` package version in favor of `pw.TableHelper.fromTextArray` — fixed before shipping rather than leaving a deprecation warning in a Play-Store-bound build.

**Self-test:**
- `flutter analyze`: 0 errors.
- `flutter test`: passes.
- Live-curled `GET /fuel/entries` and `GET /dashboard/income?range=7d` — both 401.

---

## All 9 stages complete — proceeding to final regression pass.

---
