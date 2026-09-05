# Changelog

All notable changes to ShabooAgri are documented here. Versions refer to the
mobile app (`mobile-app/pubspec.yaml`); backend and web changes ship alongside
the release they support. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [0.8.17+30] - 2026-09-05

### Operational UI/UX, information density & financial-status correction
- **List endpoints enriched (reusing existing calc services, no duplicated logic).**
  `GET /customers` now returns per-customer `outstanding` (Σ non-cancelled
  invoice balances) + `creditBalance`; `GET /drivers` returns worked time +
  earned/paid/`remainingPayable` + `paymentStatus`; `GET /machines` returns
  authoritative `totalWorkedText` + maintenance status.
- **Customer-wise work breakdowns.** `GET /drivers/:id/earnings` and
  `GET /machines/:id/utilization` now include `customerWise` (same session
  attribution as the pay/hour calcs; per-customer hours reconcile to totals).
- **Compact list screens.** Customers/Drivers/Machines use one `[ Search ][ + New ]`
  action bar (shared `ListActionBar`) instead of a heading + separate search + FAB.
- **Richer cards.** Customer: original address + phone + **green** outstanding /
  blue advance-credit. Driver: worked time + **red** payable. Machine:
  authoritative worked hours + maintenance status (amber due-soon / red overdue).
- **Detail screens** gained a "Work by Customer" section (driver & machine).
- **Financial colour language** unified: GREEN = receivable (customer
  outstanding, invoice balance due), RED = payable (driver) / UNPAID status flag;
  maintenance & availability use separate operational colours.
- **KPI cards** redesigned to a neutral surface + accent dot + large readable value.
- **Removed** the repeated per-card "After-Work" chip (the tab conveys it) and the
  standalone "Customer Advances" UI section.
- **Removed the dead read-only `GET /payments/advances` endpoint** (no remaining
  consumer). The `CustomerAdvance` model and the automatic overpayment→credit
  path are unchanged; legitimate credit is surfaced on the customer.
- **Pilot data:** the 8 test `customer_advances` rows were cleared (owner
  authorized; backup CSV in `backend/backups/`).

## [Unreleased]

### Added / Changed — Job Execution V2 (backend, Pass 1)
- **Corrected resource occupancy to WORKING-only.** The earlier fix treated
  WORKING *and* PAUSED as occupying a Machine/Driver; for ShabooAgri a PAUSED
  job ("continue later") RELEASES both resources so another booking can start on
  them. `ACTIVE_RESOURCE_OCCUPANCY = [WORKING]`.
- **RESUME now re-checks availability** (concurrency-safe, same `FOR UPDATE`
  row-lock transaction as Start): a paused job can only resume if its Machine
  and Driver are still free, else it stays PAUSED with a 409 naming the blocker.
- **Machine/Driver reassignment while PAUSED** (`POST /jobs/:id/machine|driver`,
  gated by `machine.assign`/`driver.assign`): swap a paused job's Machine/Driver
  with a **mandatory reason**, audited in `job_assignment_changes`. Never allowed
  while WORKING. **Pause now also requires a reason.**
- **Work-session history** (`job_work_sessions`): one row per continuous WORKING
  interval (Machine+Driver+duration), so a job whose resources changed mid-way
  keeps a truthful per-resource record. Sum of a job's sessions equals its
  `actualHours` — the pricing/duration calc is unchanged. Driver pay and machine
  utilisation now attribute worked time from sessions, not the current FK.
- **Transportation** (`job_transport_charges` + configurable `transport_types`
  master): optional structured charge (`trips × ratePerTrip`) added before
  submit, folded into the invoice as a separate `transport_amount` line so
  work vs transport stay clearly split. Work pricing itself unchanged.
- Additive, backward-compatible migration (4 new tables + `invoices.transport_amount`
  default 0); existing jobs/invoices untouched, no fabricated history. New tests
  `test-job-execution-v2.ts` (53 assertions) + updated `test-job-resource-conflict.ts`
  (23); full backend suite green. **Not yet deployed;** web + Flutter UI is Pass 2
  (and the Flutter/web pause/reassign/transport UI must send the now-required reasons).

### Fixed
- **A Machine or Driver could be started on two active jobs at once.** Creating a
  second booking for a machine/driver that is already working stays allowed (the
  booking-time warning offers "book anyway" for a *future* slot), but pressing
  **Start** on that second job must be refused while the resource is still busy.
  It wasn't: `job.service.ts:start()` only checked *this* job's own status,
  never whether the assigned machine or driver was already on another active
  job, so both jobs could become WORKING simultaneously. Fix enforces the rule
  in the operational backend (the single authority): Start now runs its
  check-and-flip inside one transaction that first locks the machine and driver
  rows `FOR UPDATE` (machine-then-driver, a fixed order — no deadlock) and
  rejects with **409** if any *other* job in `WORKING`/`PAUSED` already holds the
  machine or driver — reusing the same authoritative `jobs`-table occupancy
  definition the dashboard uses (no second status system; PAUSED still reserves,
  COMPLETED/CANCELLED release). The message names the exact blocking booking(s)
  — machine-only, driver-only, both-on-one-job, or both-on-different-jobs. The
  row locks serialise two devices racing to Start on the same resource: exactly
  one wins, the other is safely rejected and reconciles via the existing
  cross-device error-refresh path (no new sync mechanism). No pricing/duration
  calculation changed; no Flutter business logic added (the UI already surfaces
  the backend message and refreshes on any error). New backend test
  `test-job-resource-conflict.ts` covers 22 assertions incl. the concurrent-Start
  race; existing operations/pricing/payments suites unchanged and green.

## [0.8.12+25] — 2026-09-01

### Fixed
- **Job Execution V2 cross-device state went stale between phones.** When one
  authorized device (Manager/Owner/Driver) had a job open and *another* device
  changed it — Start/Pause/Resume/Stop/Complete — the first device kept showing
  the old status and kept its timer running. If it then acted on that stale
  state the backend correctly rejected it ("Cannot stop a job that is currently
  COMPLETED"), but the screen never reconciled, so two phones could contradict
  each other. Root cause was purely cross-device transport, not calculation: the
  backend `jobs` row was already the single source of truth and the timer was
  already derived from the server's `startTime` (not an independent stopwatch),
  but the real-time invalidation bus is in-process only — it bumps on *this*
  device's own mutations, and there was no server push or polling, so a second
  device never learned of a transition. Fix, entirely client-side, reusing the
  existing REST + provider architecture (no backend change, no schema/version
  column, no second source of truth, no change to any pricing/duration
  calculation): while a Job Details screen is open on a non-terminal job it now
  polls `GET /jobs/:id` every 5s and reconciles the authoritative status —
  controls, badges and the timer-freeze are all `status`-driven, so another
  device's Stop/Complete freezes this device's timer at the authoritative final
  duration automatically; the driver home's active-job card reconciles the same
  way. Any failed lifecycle action now refetches server state and, on a
  stale-state rejection, shows "This job was updated by another user. The latest
  job status has been loaded." The backend's `assertStatus` state-machine remains
  the (already-existing) concurrency guard that safely rejects stale mutations.

## [0.8.11+24] — 2026-08-31

### Fixed
- **Fresh-install Company Setup jumped to Sign In while typing the Company ID
  (Android).** The screen itself never navigated on keystroke — the cause was a
  global auth-failure redirect firing for background sync. On a fresh install
  (no company, no session) the cloud→device pull service fired at launch, sent
  unauthenticated GETs to the apex host, and every one returned `401`; the Dio
  auth interceptor treated that 401 as an expired session and force-navigated to
  `/login`. The round-trip landed a second or two after launch — right as the
  user began typing — so it looked keystroke-triggered. Two fixes: (1) the
  interceptor now only clears the session and redirects to `/login` on a 401 for
  a request that actually carried a token (a real expired session); a 401 on a
  tokenless request is the normal "not signed in yet" state and passes through
  untouched, protecting every pre-auth screen (Company Setup, Sign In, PIN setup,
  reset, accept-invite). (2) `SyncPullService.pullAll()` is a no-op with no
  session, so no authenticated pull traffic runs before login. One cross-platform
  codebase, backend stays authoritative, existing APIs reused — no changes to
  iOS/Windows/macOS behaviour and no Android-specific flow.

## [0.8.9+22] — 2026-08-30

### Fixed
- **Payments ledger stuck on "Loading…" (Android + web).** A POST used purely as
  a read (`POST /invoices/filter`) was misclassified as a mutation by the
  real-time refresh bus, so the payments screen invalidated and re-loaded itself
  in an infinite loop. Query-POSTs (filter/search/query/analysis/report/summary/
  export) are now treated as reads at the shared layer in both apps: they no
  longer invalidate the screen that issued them, and offline they are cached and
  served like a GET (never queued as a write). No financial logic or idempotency
  guarantee was changed; real mutations still refresh screens.

## [0.8.8+21] — 2026-08-30

Phase 2 + 3 of offline-first: genuine two-way sync and multi-user convergence.

### Added
- **Cloud→device pull** (`SyncPullService`): on login, launch, and every
  reconnect, the authoritative snapshot of the core collections is pulled into
  the local SQLite database (server-authoritative; the outbox is flushed first).
  A fresh install now has offline data app-wide after login without visiting
  each screen, and a change another device made while you were offline reaches
  you on reconnect.
- **Client-authoritative UUID identity**: an offline-created record carries a
  stable client-generated UUID before it ever syncs (backend honours it for
  villages, customers, machines, drivers, employees, bookings), so offline
  relationships survive synchronization and records are never duplicated. Human
  booking numbers remain server-allocated and collision-free.
- Explicit, documented conflict policy: independent field edits merge
  (partial PATCH); financial records stay strictly idempotent.

### Verified
- Multi-user convergence (a device offline + a device online, with restart and
  reconnect) converges with no data loss, no overwrite, no duplicate booking
  number, and no duplicate payment — proven by automated + live-backend tests.
- Physical-device runtime testing remains outstanding (no device available).

## [0.8.7+20] — 2026-08-30

Phase 1 of the global offline-first remediation, after real-device testing
showed ordinary screens still failing offline. Fixes at shared layers, not
per-screen patches.

### Added
- **Global professional error UX** — every connectivity failure (connection
  error/timeout, host lookup, socket) is translated to plain language; genuine
  server errors still show the backend's real message. No screen can surface a
  raw `DioException` / "Failed host lookup" anymore.
- **First-run offline handling** — a never-synced screen shows "connect once to
  download this" instead of a technical error or an endless spinner.
- `docs/OFFLINE_ARCHITECTURE.md` documenting the offline/sync design and
  honestly separating implemented (Phase 1) from planned (Phase 2).

### Changed
- **One sync engine** — removed the orphaned legacy `SyncService` + `SyncQueue`
  (dead code that competed with the durable outbox); repositories keep only
  their local SQLite read + API refresh.

### Notes
- Phase 2 (cloud→device pull, business-number conflict reconciliation,
  per-entity conflict policy) is documented as pending, not yet implemented.

## [0.8.6+19] — 2026-08-30

Production-grade **offline-first** across the mobile app. Every normal write
(payments, bookings, jobs, field operations, customers, villages, employees,
machines, expenses) now works with no Internet: changes are saved locally first
with an instant optimistic response, then synced automatically when
connectivity returns — no data loss, no duplicate payments, no incorrect
balances. _(PR #4 · merge `3a0ea76`)_

### Added
- **Durable offline outbox** (SQLite, survives app restart): FIFO ordering,
  exponential backoff, dead-letter for permanently rejected writes (surfaced to
  the user, never silently dropped), and automatic reconcile to authoritative
  backend data on sync.
- **Offline reads** — successful GET responses are cached and served when the
  device is offline, so lists and detail screens keep working.
- **Optimistic UI** — an offline create/edit/delete appears in the relevant
  lists immediately, without waiting for the cloud.
- **Backend idempotency middleware** — mutating requests carry a stable
  `Idempotency-Key`; a retry after a lost acknowledgement replays the stored
  successful response instead of re-running the write. This is the guarantee
  that a queued payment can never be charged twice.
- App-wide **sync status banner** (offline / syncing / needs-attention) with a
  sheet to sync now, retry, or discard failed writes.

### Changed
- On reconnect the outbox drains immediately, skipping any backoff accrued
  while offline (a network change is new information).

### Notes
- Only successful (2xx) responses are cached for idempotent replay; 4xx/5xx
  release the key so a queued op can still succeed once conditions are ready.
- Android / iOS / macOS / Windows artifacts are built in CI; app-store
  publication is a separate, manual step and is **not** included in this release.

## [0.8.5+18]

- **Global real-time sync** — after any successful mutation, every open screen
  (web and Flutter) auto-refreshes the affected data via a path-driven cascade
  bus on the HTTP layer, with the backend remaining the single source of truth.
  _(PR #3 · merge `51bb8f5`)_

## [0.8.4+17] — 2026-08-30

- **PIN auth lifecycle** — create PIN, PIN-only quick login, and forgot/reset
  PIN across backend, web, and Flutter, using a non-enumerating OTP flow.
  _(PR #2 · merge `fe0f703`)_

## [0.8.3+16] — 2026-08-29

- **Fixed** — driver dashboard crash ("Could not load dashboard: Something went
  wrong") caused by a stale Flutter binary mishandling the driver `kpis: null`
  scope.

## [0.8.2+15]

- **Android Play release** — signed release AAB (targetSdk 36) with Play
  compliance fixes (self-updater restricted to desktop, no production credential
  logging).
