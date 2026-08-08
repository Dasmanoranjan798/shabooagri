# Jobs module

## Purpose

§7/§8.4's execution layer: once a machine and driver are literally en
route, a Job tracks the actual field work — start/pause/resume/complete,
running time, completed acres, fuel used, photos, notes. This is
deliberately a separate table from Booking (§7's note explaining why):
Booking is the commercial arrangement (who/what/when/how priced); Job is
what actually happened on the ground, and is what Payments/Invoices will
bill against once that module exists — actual figures, not the Booking's
estimates.

## Architecture

```
job.routes.ts → job.controller.ts → job.service.ts → job.repository.ts (Job)
                                                     → jobStatusLog.repository.ts (JobStatusLog)
                                                     → jobPhoto.repository.ts (JobPhoto)
                                                     → fuel.service.ts (JobFuelEntry, a separate module)
```

`job.service.ts` never imports `fuel.repository.ts` directly — fuel
entries go through `fuel.service.ts`, the same cross-module-via-service
rule as every other module. See `modules/fuel/README.md` for why Fuel has
no routes of its own yet.

`shared/access/callerScope.ts` is new shared infrastructure, extracted
from `booking.service.ts` in this same round of work: both Bookings and
Jobs need the identical "is this caller company-wide, a specific driver,
or a specific customer" resolution, so a second consumer was the signal
to stop duplicating it (§3).

## Database relationships

Owns: `jobs`, `job_status_log`, `job_photos`. References (via FK, not
owned): `bookings` (1:1 — `jobs.booking_id` is unique), `machines`,
`drivers`, `users` (as the one who changed status / uploaded a photo).
Related but owned by the Fuel module: `job_fuel_entries`.

## Business rules encoded here

- **A Job is created exactly once, automatically, when a Booking
  transitions to `ON_THE_WAY`** — not via any client-facing "create job"
  endpoint (there isn't one). This is `booking.service.ts`'s
  `updateStatus()` calling `jobService.createForBooking()`, documented
  there. Why `ON_THE_WAY` specifically: §7 step 5 is "machine travels to
  location," and Job's schema requires both `machineId` and `driverId` to
  be non-null — that's only guaranteed true once a booking has actually
  reached the point of being dispatched. `updateStatus()` now rejects the
  `ON_THE_WAY` transition itself with a 400 if either is still unassigned,
  so a booking can't claim to be "on the way" with nothing assigned to
  send.
- **Status is action-driven, not an arbitrary PATCH.** Unlike Booking's
  single `PATCH .../status` accepting any target status (validated
  against a transition table), Jobs exposes one endpoint per action —
  `start`, `pause`, `resume`, `complete` — because each does more than
  flip a status: `start` sets `startTime`; `pause`/`resume` do the paused-
  time accounting below; `complete` computes `actualHours`. Each endpoint
  checks its own required starting status (`start` requires
  `NOT_STARTED`; `pause` requires `WORKING`; `resume` requires `PAUSED`;
  `complete` requires `WORKING` or `PAUSED`) rather than a shared
  transition table, and `COMPLETED` is terminal — no endpoint can act on
  a completed job.
- **Pause/resume timing math reads `job_status_log`, not just
  `jobs.total_paused_duration_sec` in isolation.** On `resume` (or on
  `complete` while currently `PAUSED`), the service looks up the most
  recent `job_status_log` row with `status = PAUSED` for this job, computes
  `now - that row's changedAt`, and adds it to the running
  `totalPausedDurationSec` total. `job_status_log` is the append-only
  record of when every transition happened; `jobs.total_paused_duration_sec`
  is a maintained running total, not independently recomputed from
  scratch elsewhere.
- **`actualHours` auto-computes on `complete`, but can be overridden.**
  Default: `(endTime - startTime - totalPausedDurationSec)` in hours,
  rounded to 2 decimals. An explicit `actualHours` in the request body
  wins instead — the Manager-records-after-the-fact flow (§7's note) may
  not use live start/pause/complete timestamps at all and just wants to
  type in the real number.
- **`fuelUsedLitres` is always derived, never directly settable.**
  `POST /jobs/:id/fuel-entries` adds a row to `job_fuel_entries` (via
  `fuel.service.ts`) and then recomputes (not increments) the job's cached
  total from all entries, so a corrected/deleted entry can't leave the
  cached total silently wrong. `PATCH /jobs/:id` deliberately excludes
  `fuelUsedLitres` from what it accepts.
- **Read access is ownership-scoped, exactly like Bookings**: Owner/Manager
  (`operations.view`) see every job in the company; a Driver sees only
  jobs assigned to them; a Farmer sees only jobs whose Booking is on their
  own Customer record (via a shallow `booking: true` include —
  Job→Booking's own scalar columns, not a second hop into Booking's
  `manager`/`creator` User relations, so this can't reintroduce the
  password/PIN hash leak fixed in the Bookings module). Out-of-scope
  access 404s, not 403s.
- **Write access is `job.update_status` PLUS an ownership check the
  permission itself doesn't express.** The route gate blocks Farmer
  entirely (0 permissions, same as everywhere else). Among the roles that
  DO hold `job.update_status` (Owner, Manager, Driver), Owner/Manager can
  act on any job in the company; a Driver can only act on the job(s)
  assigned to their own Driver profile — checked the same data-driven way
  as read-scoping (does `operations.view` apply, else does a Driver-
  profile link match), never a hardcoded role-key check.

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
| POST | `/jobs/:id/complete` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/fuel-entries` | `job.update_status` + own-job check for Driver |
| POST | `/jobs/:id/photos` | `job.update_status` + own-job check for Driver |

No `POST /jobs` — see "Business rules encoded here."

## Permissions required

`job.update_status` was already seeded to Owner (via Owner's full set),
Manager, and Driver before this module existed, with a description —
`"Record job execution progress (start/pause/complete, hours, acres,
fuel)"` — that already answered the "can a Driver set completed_acres and
fuel, or only status marks" question this task asked to confirm: yes, by
the permission's own existing seeded description, not a new judgment
call. The judgment call this module DOES add is the ownership scoping
layer on top (a Driver's copy of this permission only reaches their own
job) — Farmer's total exclusion needed no new decision, they hold 0
permissions already.

## Configuration

None.

## Important assumptions

- **Photos are local disk, same Phase 1 stub as Booking attachments** —
  `backend/uploads/job-photos/<companyId>/<jobId>/`, served via
  `express.static`, same access trade-off documented in the Bookings
  README (reachable by anyone with the URL). `job.upload.ts` mirrors
  `booking.upload.ts` rather than sharing one uploader module — the
  overlap is three lines of multer config, not enough to justify coupling
  two otherwise-independent modules together this early.
- **A Driver's `job.update_status` also covers photos and fuel entries**,
  not just status/hours/acres — the seeded permission description lists
  "hours, acres, fuel" but not photos explicitly. §8.4's live job screen
  puts "Add Photo" on the same screen as the other quick actions a driver
  uses live from the field, so treating it as covered by the same
  permission (with the same ownership scoping) follows the evident intent
  of that screen. Flagged in case that reading turns out to be wrong.
- **Completing a job does not touch the Booking's own status field.**
  Booking still has its own `WORKING`/`COMPLETED` statuses, set via its
  own `PATCH .../status` endpoint, independent of the Job's lifecycle.
  Nothing currently auto-syncs "Job completed" → "Booking completed" —
  that's a real gap worth closing (likely by having
  `booking.service.updateStatus` and `job.service.complete` agree on who
  drives the other, or a light sync step), deliberately left alone here to
  keep this module's scope to what was asked.

## What was tested

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
  response, verifying the fix from the Bookings module isn't
  reintroduced by Job's own include.

All synthetic users, master data, bookings, jobs, fuel entries, photos,
and uploaded files were deleted afterward (the pilot company's booking
number counter was also reset to 1); `tsc --noEmit` passes clean.
