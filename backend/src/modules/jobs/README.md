# Jobs module

> **Rebuilt 2026-08-17/18** to the Booking → Job Card → Stop → Submit
> flow (business-owner-approved mockup). This document describes the
> *current* architecture. The **"What was tested" section at the bottom is
> unchanged from the original build and reflects testing performed at
> that time, prior to the 2026-08-17/18 workflow rebuild** — kept for
> historical record, not as a claim that today's code has been
> re-verified against it.

## Purpose

A Job tracks the actual field work behind a Booking: start/pause/resume/
stop/submit, running time, completed acres, fuel used, photos, notes.
Deliberately a separate table from Booking — Booking is the commercial
arrangement (who/what/when); Job is what actually happened on the
ground, and is what Payments/Invoices bill against — actual figures, not
estimates.

A Job Card now exists from the moment its Booking is saved (see the
Bookings module's README) — there is no "dispatch" stage it waits for.
Its card shows "Ready to Start" once `machineId`/`driverId` are both set,
"Awaiting Machine" until then; pricing is deliberately *not* part of that
signal — it's picked on the Live Job screen itself, right before Start
(`assignPricing`, in the Bookings module), so gating the card badge on it
would make "Ready to Start" unreachable.

The old single `complete()` action is gone, split into two distinct
steps matching the mockup's two separate confirmations:
- **`stop()`**: `WORKING`/`PAUSED` → `STOPPED`. Freezes `endTime`/
  `actualHours`. No invoice yet — this is "the machine has physically
  stopped," not "the paperwork is done."
- **`submit()`**: `STOPPED`-only → `COMPLETED`. Runs the mandatory
  photo/fuel-log checks, generates the invoice, and is the actual point
  of no return — once submitted, only the Owner can edit the job.

## Resource occupancy, reassignment, work-session history & transportation (Job Execution V2)

**Resource occupancy — only WORKING occupies.** A physical Machine and a
Driver may each be on only ONE active job at a time, where *active* =
`ACTIVE_RESOURCE_OCCUPANCY = [WORKING]` (`job.repository.ts`). **PAUSED does
NOT occupy** — pausing releases the Machine and Driver so another booking can
start on them meanwhile. NOT_STARTED/STOPPED/COMPLETED/CANCELLED hold nothing.
Creating a *booking* for a busy resource stays allowed (that soft warning lives
at booking creation); the hard rule is enforced at **Start and Resume**.

- **`start()` / `resume()`** both run their check-and-flip in one
  `prisma.$transaction` that first locks the Machine and Driver rows
  `FOR UPDATE` (machine-then-driver, a fixed order → no deadlock), then rejects
  with **409** (naming the exact blocking booking) if either resource is
  WORKING elsewhere. This serialises two devices racing to activate jobs that
  share a resource — exactly one wins. `resume()` re-checks availability from
  scratch: a resource free when the job paused may have been taken since.
- **Reassignment while PAUSED** — `changeMachine()` / `changeDriver()`
  (routes `POST /jobs/:id/machine|driver`, gated by `machine.assign` /
  `driver.assign`) let an authorised Manager/Owner swap the Machine/Driver of a
  **PAUSED** job (never while WORKING). A **reason is required**; each change is
  audited in `job_assignment_changes` (old, new, reason, user, time). The new
  resource is not considered occupied until the job actually resumes.

**Work sessions (`job_work_sessions`)** — one row per continuous WORKING
interval, opened on start/resume and closed on pause/stop, recording exactly
which Machine + Driver did that stretch. A job whose resources changed mid-way
keeps a truthful per-resource history. The **sum of a job's session durations
equals its `actualHours`** — the existing duration/pricing calculation is
unchanged; sessions only make the same worked time *attributable*. Driver pay
(`driverCompensation.service`) and machine utilisation (`jobReport.service`)
attribute each job's authoritative `actualHours` across its sessions
proportionally to per-resource session time — **never** from the job's current
`machineId`/`driverId`, so a reassignment can't misattribute history. Jobs with
no sessions (MANUAL entries, pre-feature legacy) fall back to the current FK.

**Transportation (`job_transport_charges` + `transport_types`)** — an optional,
structured charge on the same job (`POST /jobs/:id/transport`), separate from
the harvesting timer: `total = trips × ratePerTrip` (server-computed). Added
before submit; at submit the invoice `totalAmount = work subtotal + Σ transport`
(new `invoices.transport_amount` column), so work vs transport stay a clean
two-line breakdown. Transport types are a company-configurable master
(`/transport-types`, seeded Tractor/Tipper/Pickup/Trailer/Truck). **Pause now
requires a reason** (`pauseJobSchema`) — clients must send one.

Read endpoints for the timeline/reports: `GET /jobs/:id/work-sessions`,
`/assignment-changes`, `/transport`, `/work-summary` (per-driver & per-machine
hours + transport totals, from history).

## Architecture

```
job.routes.ts → job.controller.ts → job.service.ts → job.repository.ts (Job)
                                                     → jobStatusLog.repository.ts (JobStatusLog)
                                                     → jobPhoto.repository.ts (JobPhoto)
                                                     → fuel.service.ts (JobFuelEntry, a separate module)
```

`job.service.ts` never imports `fuel.repository.ts` directly — fuel
entries go through `fuel.service.ts`, the same cross-module-via-service
rule as every other module.

`shared/access/callerScope.ts` is shared infrastructure: both Bookings
and Jobs need the identical "is this caller company-wide, a specific
driver, or a specific customer" resolution.

## Database relationships

Owns: `jobs`, `job_status_log`, `job_photos`. References (via FK, not
owned): `bookings` (1:1 — `jobs.booking_id` is unique), `machines`
(nullable), `drivers` (nullable), `users` (as the one who changed status
/ uploaded a photo). Related but owned by the Fuel module:
`job_fuel_entries`.

## Business rules encoded here

- **A Job is created exactly once, automatically, the instant its
  Booking is saved** — not via any client-facing "create job" endpoint
  (there isn't one), and no longer gated on any dispatch status. This is
  `booking.service.ts`'s `create()` calling `jobService.createForBooking()`.
  `machineId`/`driverId` are nullable on the Job (as on the Booking) —
  a card can exist "Awaiting Machine" with nothing assigned yet.
- **`machineId`/`driverId` stay in sync with the Booking while the Job
  hasn't started.** `jobService.syncAssignmentForBooking()`, called from
  `booking.service.ts`'s `assignMachine`/`assignDriver`, mirrors a
  post-creation assignment onto the (still `NOT_STARTED`) Job row.
  No-ops once the job has actually started, so a later reassignment on
  the booking never retroactively rewrites a job already in progress.
- **Status is action-driven, not an arbitrary PATCH.** Jobs exposes one
  endpoint per action — `start`, `pause`, `resume`, `stop`, `submit` —
  because each does more than flip a status: `start` sets `startTime`
  (and rejects if machine/driver/pricing aren't all set yet); `pause`/
  `resume` do the paused-time accounting below; `stop` computes
  `actualHours`; `submit` runs the completion checks and creates the
  invoice. Each endpoint checks its own required starting status
  (`start` requires `NOT_STARTED`; `pause` requires `WORKING`; `resume`
  requires `PAUSED`; `stop` requires `WORKING` or `PAUSED`; `submit`
  requires `STOPPED`) rather than a shared transition table, and
  `COMPLETED` is terminal for the lifecycle actions (though see `cancel`
  below, which can still act on it).
- **`resume` now requires a reason — `note` is mandatory, not optional.**
  Enforced by `resumeJobSchema` (`z.string().trim().min(1)`), stored via
  the existing `jobStatusLogRepository.create(..., note)` call (no schema
  change needed — the column already existed, optional, for `pause`).
  `pause` itself still takes an optional note.
- **Pause/resume timing math reads `job_status_log`, not just
  `jobs.total_paused_duration_sec` in isolation.** On `resume` (or on
  `stop` while currently `PAUSED`), the service looks up the most
  recent `job_status_log` row with `status = PAUSED` for this job, computes
  `now - that row's changedAt`, and adds it to the running
  `totalPausedDurationSec` total.
- **`actualHours` auto-computes on `stop`, but can be overridden.**
  Default: `(endTime - startTime - totalPausedDurationSec)` in hours,
  rounded to 2 decimals. An explicit `actualHours` in the request body
  wins instead.
- **`fuelUsedLitres` is always derived, never directly settable.**
  `POST /jobs/:id/fuel-entries` adds a row to `job_fuel_entries` and then
  recomputes (not increments) the job's cached total from all entries.
- **`cancel()` accepts `STOPPED` as a source status, alongside
  `NOT_STARTED`/`WORKING`/`PAUSED`/`COMPLETED`.** A job frozen at Stop
  but blocked from Submit (e.g. a missing required photo) still needs an
  escape hatch. `COMPLETED` remains cancellable too, for the same reason
  as before: void the payment, then cancel the (completed) job.
- **Read access is ownership-scoped, exactly like Bookings**: Owner/Manager
  (`operations.view`) see every job in the company; a Driver sees only
  jobs assigned to them; a Farmer sees only jobs whose Booking is on their
  own Customer record. Out-of-scope access 404s, not 403s. List/get
  responses also carry a computed `isReadyToStart` (see Purpose above).
- **Write access is `job.update_status` PLUS an ownership check the
  permission itself doesn't express.** Among the roles that hold
  `job.update_status` (Owner, Manager, Driver), Owner/Manager can act on
  any job in the company; a Driver can only act on the job(s) assigned to
  their own Driver profile.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/jobs` | Authenticated only — scoped per role |
| GET | `/jobs/:id` | Authenticated only — scoped per role |
| GET | `/jobs/:id/fuel-entries` | Same scoping as `GET /jobs/:id` |
| GET | `/jobs/:id/photos` | Same scoping as `GET /jobs/:id` |
| PATCH | `/jobs/:id` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/start` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/pause` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/resume` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/stop` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/submit` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/cancel` | `job.cancel` (Owner-only) |
| POST | `/jobs/:id/fuel-entries` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/photos` | `job.update_status` + own-job check for Driver |

No `POST /jobs` — see "Business rules encoded here." There is no longer a
`POST /jobs/:id/complete` — it split into `stop` + `submit` above.

## Permissions required

`job.update_status` was already seeded to Owner (via Owner's full set),
Manager, and Driver before this module existed. The ownership scoping
layer on top (a Driver's copy of this permission only reaches their own
job) is this module's own addition; Farmer's total exclusion needed no
new decision — they hold 0 permissions.

## Configuration

None.

## Important assumptions

- **Photos are local disk, same Phase 1 stub as Booking attachments** —
  `backend/uploads/job-photos/<companyId>/<jobId>/`, served via
  `express.static`, same access trade-off documented in the Bookings
  README (reachable by anyone with the URL).
- **A Driver's `job.update_status` also covers photos and fuel entries**,
  not just status/hours/acres, and — since the rebuild — the booking's
  `assignPricing` endpoint too (in the Bookings module, but gated on this
  same permission deliberately, so a Driver can complete the whole
  Start-gating pricing step from the Live Job screen without needing a
  Manager/Owner).
- **`stop()` does not touch the Booking's status; `submit()` does.**
  Booking's own status only moves to `WORKING` (on `start()`) and
  `COMPLETED`/`CANCELLED` (on `submit()`/`cancel()`) — there's no
  intermediate "booking is stopped" state, since Booking.status was
  always a coarser signal than the Job's own lifecycle even before the
  rebuild.

## What was tested

> **Historical — reflects testing performed at the time of the original
> build, prior to the 2026-08-17/18 workflow rebuild.** The scenario
> below describing `ON_THE_WAY` triggering job creation, and any mention
> of a single `complete` action, describe behavior that has since been
> removed/replaced by immediate Job Card creation and the stop/submit
> split respectively. Kept as a record of what was verified then, not as
> current-state documentation — see the sections above for what's
> actually true today. Stages 1–7 of the rebuild itself were verified by
> code-tracing/reasoning through each call path end to end (no live
> browser session was available), not by re-running this kind of live
> HTTP test pass — a real manual walkthrough against a live browser
> session is still outstanding.

Run live against the dev server + Postgres: Owner, Manager, a Driver
assigned to two jobs, a second Driver assigned to neither (isolation
check), and a Farmer whose Customer record owns both underlying bookings.

- **Booking → Job trigger**: created a booking with no machine/driver;
  `PATCH .../status {ON_THE_WAY}` → 400 (guard rejects); assigned a
  machine only → still 400; assigned a driver too → `ON_THE_WAY` now
  succeeds (200) and a Job row exists in the DB with the correct
  `machineId`/`driverId` and `status: NOT_STARTED`, confirmed directly via
  `psql`, not just the HTTP response.
- **Permission + ownership gating**: Farmer attempting `start` → 403 (no
  `job.update_status`). The second Driver — who holds the same permission
  but isn't assigned to this job — attempting `start`/`resume`/adding a
  fuel entry/uploading a photo → 403 each time (the ownership check on top
  of the permission, not just the permission itself).
- **Status preconditions**: `pause` before `start` → 400; `start` while
  already `WORKING` → 400; `complete` on an already-`COMPLETED` job → 400
  (terminal). The assigned Driver's `start` → 200 (`status: WORKING`,
  `startTime` set).
- **Pause/resume timing math**: paused, waited ~2 real seconds, resumed —
  `totalPausedDurationSec` came back as `2`, confirming the computation
  reads the actual elapsed time from `job_status_log`'s most recent
  `PAUSED` row rather than a hardcoded or estimated value.
- **Complete — both flows**: live-tracking flow (job 1) completed with no
  `actualHours` supplied → auto-computed from real elapsed
  start/pause/resume/complete timestamps (a small fractional value,
  correctly reflecting the short real time the test took, with the paused
  duration properly excluded). Manager-records-after-the-fact flow (job
  2) — a second booking/job created and started with an explicit
  backdated `startTime`, then completed with an explicit `endTime` AND
  `actualHours: 4.5` — the response returned exactly `4.5`, confirming the
  manual override wins over auto-computation rather than being silently
  ignored.
- **Fuel entries**: two entries added by the assigned Driver (15.5L,
  4.5L) → `job.fuelUsedLitres` reads back as `20` (the derived sum, not an
  increment that could drift); `GET .../fuel-entries` lists both.
- **Photos**: assigned Driver uploads a photo with a caption → 201, the
  returned `fileUrl` is fetchable via `GET` on that same URL → 200;
  `GET .../photos` lists it.
- **Read scoping**: Owner and the assigned Driver both see 2 jobs via
  `GET /jobs`; the unrelated second Driver sees 0; the Farmer (owner of
  both bookings' Customer record) sees 2. Direct `GET` on an out-of-scope
  job → 404 for the unrelated Driver. No token → 401.
- **Security regression check**: fetched a job as Owner and confirmed the
  shallow `booking: true` include exposes only Booking's own scalar
  columns (`customerId`, `managerId`, etc. as raw ids) — no nested
  `manager` object and no `passwordHash`/`pinHash` anywhere in the
  response.

All synthetic users, master data, bookings, jobs, fuel entries, photos,
and uploaded files were deleted afterward (the pilot company's booking
number counter was also reset to 1); `tsc --noEmit` passes clean.
