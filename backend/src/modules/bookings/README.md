# Bookings module

> **Rebuilt 2026-08-17/18** to the Booking → Job Card → Stop → Submit
> flow (business-owner-approved mockup). This document describes the
> *current* architecture. The dispatch-status pipeline
> (Pending → Accepted → On the way → Working → Completed) it replaces is
> gone from the code; where this doc still needs to mention it, it's
> called out explicitly as history, not current behavior. The
> **"What was tested" section at the bottom is unchanged from the original
> build and reflects testing performed at that time, prior to the
> 2026-08-17/18 workflow rebuild** — it is kept for historical record, not
> as a claim that today's code has been re-verified against it.

## Purpose

A Manager books a customer's job with the minimum needed to get it on the
schedule: Farmer, Village, and a free-text description of the work needed
(`workDescription`). Machine and driver are optional at this point —
assign now or later. Pricing is **not** entered here at all; it's decided
live, on the Live Job screen, right before the work actually starts (see
the Jobs module's README).

Saving a Booking immediately creates its Job Card (`jobService.createForBooking`,
called from `create()` below) — there is no separate "convert to job"
step and no dispatch-status walk to get there. The card shows
"Ready to Start" once a machine and driver are both assigned, "Awaiting
Machine" until then. `booking.status` (the old `BookingStatus` enum) still
exists in the schema and is still synced to `WORKING`/`COMPLETED`/
`CANCELLED` as a side effect of the linked Job's own lifecycle actions
(see `job.service.ts`), but nothing in the app writes `PENDING` →
`ACCEPTED` → `ON_THE_WAY` anymore, and nothing reads `booking.status` as
the primary source of truth for what stage a booking is at — the Job
Card's own status (and, before it starts, `isReadyToStart`) is that
source of truth everywhere in the UI now.

## Architecture

```
booking.routes.ts → booking.controller.ts → booking.service.ts → booking.repository.ts (Booking) / bookingAttachment.repository.ts (BookingAttachment)
```

`booking.service.ts` is the busiest service in the codebase — it
cross-validates against six other modules' own services (Customers,
Villages, Machines, Drivers, Pricing Methods, Auth) and never queries
their tables directly, same pattern as every module before it. It also
calls `jobService.createForBooking()` on every create, and
`jobService.syncAssignmentForBooking()` on every machine/driver
assignment (keeping a not-yet-started Job Card's own `machineId`/
`driverId` in sync with later booking-level assignment — without it, a
card assigned after creation could never flip from "Awaiting Machine" to
"Ready to Start").

`shared/pricing/pricing-calculator.ts` is shared infrastructure: the
single function that turns `(pricing_method.unit, rate, quantity)` into
an amount. Booking calls it here to derive a display-only
`estimatedAmount` on every read (now usually `null` — see "Important
assumptions"); the Jobs module's Live Job screen mirrors the same
function client-side (`frontend/src/lib/pricing.ts`) for its live price
display, and Payments calls the backend original again for the real
invoiced amount. No module reimplements the multiplication.

## Database relationships

Owns: `bookings`, `booking_attachments`. References (via FK, not owned):
`customers`, `villages`, `machines` (nullable), `drivers` (nullable),
`users` (as manager and as creator), `pricing_methods` (nullable — see
below). Referenced by (not owned): `jobs.booking_id`, `invoices.booking_id`.

## Business rules encoded here

- **Booking number**: auto-generated per company as `BK-000001`,
  `BK-000002`, ... Backed by a strictly monotonic counter
  (`companies.next_booking_number`) that is only ever incremented, never
  recomputed from the bookings table — a hard-deleted booking's number is
  never reassigned (see "Important assumptions").
- **Machine/Driver nullable at creation**: a booking can be created
  before either is decided, then assigned later via the dedicated
  assign-machine / assign-driver endpoints — which also propagate to the
  already-created Job Card while it's still `NOT_STARTED` (see
  Architecture above).
- **Pricing method/rate nullable at creation, set via a dedicated
  endpoint**: `pricingMethodId`/`rate` are optional on create and
  excluded from the general `PATCH /bookings/:id` update — they're set
  through `PATCH /bookings/:id/pricing` (`assignPricing`), called from
  the Live Job screen right before Start. That endpoint is gated by
  `job.update_status`, not `booking.edit` — deliberately, so a Driver can
  perform this step too, not just Owner/Manager.
- **`workDescription` is required at creation, separate from `notes`**:
  a short free-text description of the work needed, shown on the Job
  Cards list and the Live Job header. `notes` keeps its original meaning
  (job-execution notes, general instructions) and stays optional.
- **Manager defaults to the creator**: if `managerId` is omitted on
  create, it's set to the authenticated caller. An explicit `managerId` is
  still accepted (and validated as an existing user in the company) so an
  Owner can create a booking on a Manager's behalf.
- **Cross-module validation, not re-querying**: `customerId` → Customers'
  `getById`; `villageId` → Villages' `getById`; `machineId`/`driverId`/
  `pricingMethodId` (if present) → their owning module's `getById`;
  `managerId` → Auth's `getUserForCompany`. Any bad reference is a clean
  404 from the owning module, not a raw DB error.
- **No booking-level status-transition endpoint anymore.** The old
  `PATCH /bookings/:id/status` and its `ALLOWED_TRANSITIONS` graph are
  gone. `booking.status` is now only ever written as a side effect of the
  linked Job's own actions (`start()`/`submit()`/`cancel()` in
  `job.service.ts`) — there is no direct client-facing way to move a
  booking's status on its own.
- **Estimated amount is computed, never stored, and usually `null` now.**
  Derived on every read from `rate` + `pricingMethod.unit` +
  `estimatedHours`/`estimatedAcres` via the shared pricing-calculator —
  same mechanism as before the rebuild — but since pricing isn't set
  until the Live Job screen and the current booking form no longer
  collects `estimatedHours`/`estimatedAcres` at all, this resolves to
  `null` for essentially every new booking. Kept rather than removed
  because the after-the-fact manual-entry flow (`createManualEntryJob`)
  still sets pricing/hours/acres directly at creation, where this is
  still meaningful.
- **Read access is ownership-scoped, not permission-gated**: unlike the
  master-data modules, `GET /bookings` and `GET /bookings/:id` carry no
  `requirePermission` — every role can call them, but `booking.service.ts`
  resolves what the caller is actually allowed to see: Owner/Manager
  (anyone holding `operations.view`) get the full company list; a Driver
  gets only bookings where they're the assigned driver; a Farmer gets only
  bookings where they're the customer; anyone with neither a Driver nor
  Customer record linked to their user account sees an empty list. A
  booking outside the caller's scope 404s on direct fetch rather than
  403ing, so its existence isn't leaked.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/bookings` | Authenticated only — scoped per role, see above |
| GET | `/bookings/:id` | Authenticated only — scoped per role, see above |
| GET | `/bookings/:id/attachments` | Same scoping as `GET /bookings/:id` |
| POST | `/bookings` | `booking.create` |
| PATCH | `/bookings/:id` | `booking.edit` |
| PATCH | `/bookings/:id/machine` | `machine.assign` |
| PATCH | `/bookings/:id/driver` | `driver.assign` |
| PATCH | `/bookings/:id/pricing` | `job.update_status` (not `booking.edit` — see above) |
| DELETE | `/bookings/:id` | `booking.delete` |
| POST | `/bookings/:id/attachments` | `booking.edit` |

## Permissions required

`booking.create` and `booking.edit` were already seeded to Manager (and
Owner, via Owner's full set) before this module existed. `booking.delete`
remains Owner-only (a hard removal of the record, distinct from
cancelling — see below). `machine.assign` and `driver.assign` are also
Manager/Owner. `PATCH /bookings/:id/pricing` deliberately reuses
`job.update_status` (Owner/Manager/Driver) instead of `booking.edit` —
it's conceptually the first step of the Live Job screen, not a general
booking edit, and a Driver operating that screen needs to be able to do
it.

**Delete vs. Cancel**: `DELETE /bookings/:id` (gated by `booking.delete`,
Owner-only) is a hard removal — for correcting a mistake, not for a job
that didn't happen. There is no direct booking-level cancel action
anymore — cancelling a real booking means cancelling its Job
(`POST /jobs/:id/cancel`, Owner-only via `job.cancel`), which syncs
`booking.status` to `CANCELLED` as a side effect and keeps both records
for history.

## Configuration

None.

## Important assumptions

- **Booking number generation is a monotonic counter on `companies`, not a
  count of the bookings table.** An earlier version counted existing
  bookings and used `count + 1`, which meant a hard-deleted booking's
  number could be reassigned to the next booking created — confirmed by
  testing, then fixed before anything was built on top of Bookings.
  `companies.next_booking_number` (migration
  `20260808052323_add_company_next_booking_number`) is incremented
  atomically (`SET next_booking_number = next_booking_number + 1
  RETURNING next_booking_number`) on every booking creation and never
  decremented, recomputed, or read from the bookings table — so a number
  is claimed exactly once, ever, regardless of later deletes.
- **`estimatedHours`/`estimatedAcres` still exist in the schema and API
  but are no longer collected by the primary booking-creation UI.** They
  remain accepted (optional) on `createBookingSchema` for API
  flexibility and for the manual-entry flow, but the standard booking
  form (`BookingFormModal.tsx`) doesn't expose them — per-minute pricing's
  `estimatedHours × 60` derivation (below) is accordingly close to dead
  code on the normal create path now, though still exercised by manual
  entries.
- **Per-minute pricing derives its quantity from `estimatedHours × 60`,
  where an estimate exists at all.** The schema has `estimatedHours` and
  `estimatedAcres`, no separate `estimatedMinutes`. Flagged for review if
  this ever needs finer-grained input than "estimated hours."
- **Booking attachments are local disk, not object storage** (per the
  explicit go-ahead to keep Phase 1 storage simple). Files land in
  `backend/uploads/booking-attachments/<companyId>/<bookingId>/` and are
  served back out via `express.static` at
  `/uploads/booking-attachments/...` — reachable by anyone with the URL,
  not just an authenticated request. Acceptable for a single pilot company
  testing internally; revisit (signed URLs, or real object storage) before
  wider rollout.
- **Creating a booking with a `machineId`/`driverId` already set does not
  additionally require `machine.assign`/`driver.assign`.** Creation is one
  action gated by `booking.create` alone; those two permissions gate the
  dedicated *post-creation* assign/reassign endpoints. In the current
  seed both roles that can create bookings (Owner, Manager) also hold
  `machine.assign`/`driver.assign`, so this doesn't currently create a
  gap in practice.
- **`managerId` is validated as "an existing user in the company," not as
  "a user holding the Manager role specifically."** Enforcing the latter
  would block an Owner from being recorded as a booking's manager in a
  small operation.

## What was tested

> **Historical — reflects testing performed at the time of the original
> build, prior to the 2026-08-17/18 workflow rebuild.** Several of the
> scenarios below (status transitions, the `PATCH .../status` endpoint,
> `ON_THE_WAY` triggering job creation) describe behavior that has since
> been removed. This section is kept as a record of what was verified
> then, not as current-state documentation — see the sections above for
> what's actually true today, and the Jobs module README for the new
> flow's own testing note.

Run live against the dev server + Postgres (4 fresh role tokens: Owner,
Manager, a Driver with a linked Employee+Driver profile, a Farmer with a
linked Customer record):

- **Create**: valid booking (customer + village + machine + driver +
  per-hour pricing) as Manager → 201, correct `bookingNumber`
  (`BK-000001`), `managerId` defaulted to the creating Manager,
  `estimatedAmount` correctly computed (`rate × estimatedHours`). Missing
  `customerId` → 400. Bogus `villageId` / `pricingMethodId` / `machineId`
  / `driverId` each → 404 via their owning module's own service. As
  Driver → 403; as Farmer → 403.
- **Security fix caught by this test pass**: the first create's response
  included the full `manager` User row — `passwordHash`/`pinHash`
  included — via an unscoped `include: { manager: true }`. Fixed by
  switching to a `select` of only safe fields in `booking.repository.ts`;
  re-tested and confirmed the hash fields no longer appear anywhere in the
  response.
- **Ownership-scoped list/get**: created a second booking for an unrelated
  customer with no driver assigned. Owner and Manager both see both
  bookings via `GET /bookings`. The Driver sees only the one booking
  assigned to them (1 of 2); the Farmer sees only the one booking on their
  own Customer record (1 of 2). Direct `GET /bookings/:id` on the
  out-of-scope booking → 404 for both Driver and Farmer (not 403 — scope
  is not leaked). No token → 401.
- **Status transitions**: Pending → Completed directly → 400 (skips
  steps); the full legal chain Pending → Accepted → On the way → Working →
  Completed each → 200; a backward jump (On the way → Accepted) → 400;
  Completed → Cancelled (terminal state) → 400. Driver attempting any
  status change → 403 (no `booking.edit`).
- **Assign machine / assign driver**: valid assignment as Manager → 200;
  bogus id → 404; unassigning a driver via `driverId: null` → 200; Driver
  attempting either → 403 (no `machine.assign`/`driver.assign`).
- **General edit**: Manager updates `notes`/`rate` → 200; Driver attempts
  the same → 403.
- **Delete vs. permission split**: Manager attempts `DELETE` → 403
  (`booking.delete` is Owner-only in the current seed); Owner → 204;
  subsequent `GET` on the deleted booking → 404.
- **Attachments**: Manager uploads a file to a booking they can edit →
  201, returned `fileUrl` is fetchable via `GET` on that same URL → 200;
  Driver attempting upload → 403 (no `booking.edit`); `GET .../attachments`
  respects the same ownership scoping as the booking itself — 200 for the
  Driver/Farmer who own that specific booking, 404 for an unrelated
  booking; posting with no file → 400.
- **Pricing calculator coverage**: verified all three quantity-based units
  directly through booking creation — `per_hour` (rate × hours),
  `per_minute` (rate × hours×60), `per_acre` (rate × acres) — plus
  `per_job` (flat rate, quantity ignored) and the "no estimate entered
  yet" case (`estimatedAmount: null`, not a thrown error).
- **Booking-number monotonicity**: initially caught the opposite of what's
  true today — the original count-based generator reassigned a deleted
  booking's number to the next one created, confirmed directly by
  testing. Replaced with the atomic `companies.next_booking_number`
  counter and re-tested the same scenario (create → hard-delete → create
  again): the new booking gets a fresh, never-before-used number. Also
  fired 5 concurrent booking creations and confirmed 5 distinct, gapless
  numbers with no collision.

All synthetic bookings, attachments, uploaded files, and their supporting
villages/machines/employees/drivers/customers/users were deleted
afterward; `tsc --noEmit` passes clean.
