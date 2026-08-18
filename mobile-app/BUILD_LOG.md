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
