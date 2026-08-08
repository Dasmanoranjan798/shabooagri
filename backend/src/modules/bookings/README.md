# Bookings module

## Purpose

The core §7/§8.1 workflow: a Manager books a customer's job against a
village/machine/driver/pricing method, then moves it through
Pending → Accepted → On the way → Working → Completed (or Cancelled) as
work actually happens. This is the record Jobs (execution) and Invoices
(billing) will both hang off of once those modules exist.

## Architecture

```
booking.routes.ts → booking.controller.ts → booking.service.ts → booking.repository.ts (Booking) / bookingAttachment.repository.ts (BookingAttachment)
```

`booking.service.ts` is the busiest service in the codebase so far — it
cross-validates against six other modules' own services (Customers,
Villages, Machines, Drivers, Pricing Methods, Auth) and never queries
their tables directly, same pattern as every module before it.

`shared/pricing/pricing-calculator.ts` is new shared infrastructure: the
single function that turns `(pricing_method.unit, rate, quantity)` into an
amount. Booking calls it here to derive a display-only `estimatedAmount`
on every read; Invoices will call the same function later against actual
job hours/acres for the real invoiced amount. Neither module reimplements
the multiplication.

## Database relationships

Owns: `bookings`, `booking_attachments`. References (via FK, not owned):
`customers`, `villages`, `machines` (nullable), `drivers` (nullable),
`users` (as manager and as creator), `pricing_methods`. Referenced by (not
owned, not built yet): `jobs.booking_id`, `invoices.booking_id`.

## Business rules encoded here

- **Booking number**: auto-generated per company as `BK-000001`,
  `BK-000002`, ... Backed by a strictly monotonic counter
  (`companies.next_booking_number`) that is only ever incremented, never
  recomputed from the bookings table — a hard-deleted booking's number is
  never reassigned (see "Important assumptions").
- **Machine/Driver nullable at creation** (§8.1 schema note): a booking
  can be created before either is decided, then assigned later via the
  dedicated assign-machine / assign-driver endpoints.
- **Manager defaults to the creator**: if `managerId` is omitted on
  create, it's set to the authenticated caller. An explicit `managerId` is
  still accepted (and validated as an existing user in the company) so an
  Owner can create a booking on a Manager's behalf.
- **Cross-module validation, not re-querying**: `customerId` → Customers'
  `getById`; `villageId` → Villages' `getById`; `machineId`/`driverId` (if
  present) → Machines'/Drivers' `getById`; `managerId` → Auth's
  `getUserForCompany`; `pricingMethodId` → Pricing Methods' `getById`
  (also confirms the method is still active). Any bad reference is a clean
  404 from the owning module, not a raw DB error.
- **Status transitions are a graph, not a free-for-all**: encoded in
  `ALLOWED_TRANSITIONS` in `booking.service.ts` —
  `PENDING → ACCEPTED|CANCELLED`, `ACCEPTED → ON_THE_WAY|CANCELLED`,
  `ON_THE_WAY → WORKING|CANCELLED`, `WORKING → COMPLETED|CANCELLED`;
  `COMPLETED` and `CANCELLED` are terminal. An invalid jump (e.g. Pending
  straight to Completed) is a 400, not a DB constraint.
- **Estimated amount is computed, never stored**: derived on every read
  from `rate` + `pricingMethod.unit` + `estimatedHours`/`estimatedAcres`
  via the shared pricing-calculator. For `hour`/`acre` methods the
  matching estimated field is the quantity; for `minute`, `estimatedHours`
  is converted to minutes (there's no separate estimated-minutes field in
  the schema — see "Important assumptions"); flat-rate methods
  (`per_job`/`minimum_charge`/`custom`) ignore quantity entirely and the
  amount is just the rate.
- **Read access is ownership-scoped, not permission-gated**: unlike the
  master-data modules, `GET /bookings` and `GET /bookings/:id` carry no
  `requirePermission` — every role can call them, but `booking.service.ts`
  resolves what the caller is actually allowed to see: Owner/Manager
  (anyone holding `operations.view`) get the full company list; a Driver
  gets only bookings where they're the assigned driver; a Farmer gets only
  bookings where they're the customer; anyone with neither a Driver nor
  Customer record linked to their user account sees an empty list. A
  booking outside the caller's scope 404s on direct fetch rather than
  403ing, so its existence isn't leaked. This is the "ownership-scoped
  query" the Customers module's README flagged as the intended design for
  Farmer's own-record access — implemented here now that Bookings exists.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/bookings` | Authenticated only — scoped per role, see above |
| GET | `/bookings/:id` | Authenticated only — scoped per role, see above |
| GET | `/bookings/:id/attachments` | Same scoping as `GET /bookings/:id` |
| POST | `/bookings` | `booking.create` |
| PATCH | `/bookings/:id` | `booking.edit` |
| PATCH | `/bookings/:id/status` | `booking.edit` |
| PATCH | `/bookings/:id/machine` | `machine.assign` |
| PATCH | `/bookings/:id/driver` | `driver.assign` |
| DELETE | `/bookings/:id` | `booking.delete` |
| POST | `/bookings/:id/attachments` | `booking.edit` |

## Permissions required

`booking.create` and `booking.edit` were already seeded to Manager (and
Owner, via Owner's full set) before this module existed — confirmed, not
newly added. `booking.delete` remains Owner-only (a hard removal of the
record, distinct from cancelling — see below). `machine.assign` and
`driver.assign` were also already seeded to Manager/Owner and are used
here for the first time, exactly matching their seeded descriptions
("Assign a machine/driver to a booking").

**Delete vs. Cancel**: `DELETE /bookings/:id` (gated by `booking.delete`,
Owner-only) is a hard removal — for correcting a mistake, not for a job
that didn't happen. Cancelling a real booking is a status transition to
`CANCELLED` (gated by `booking.edit`, Owner/Manager), which keeps the
record for history/reporting.

**Status transitions are Manager/Owner-only for now, not
`job.update_status`**: §7 describes a Driver optionally logging their own
field progress directly, but that's the Jobs module's live-execution
screen (§8.4, not yet built) recording start/pause/complete against a
`Job` row, not this module's booking-level status. A Driver's own
`job.update_status` permission will connect to the Jobs module once it
exists; it does not currently grant any write access here. Flagged for
re-confirmation once Jobs is built.

## Configuration

None.

## Important assumptions

- **Booking number generation is a monotonic counter on `companies`, not a
  count of the bookings table.** An earlier version counted existing
  bookings and used `count + 1`, which meant a hard-deleted booking's
  number could be reassigned to the next booking created — confirmed by
  testing, then fixed before anything was built on top of Bookings (real
  trust risk once invoices/receipts/driver messages reference the
  number, not a cosmetic issue). The fix:
  `companies.next_booking_number` (migration
  `20260808052323_add_company_next_booking_number`) is incremented
  atomically (`SET next_booking_number = next_booking_number + 1
  RETURNING next_booking_number`) on every booking creation and never
  decremented, recomputed, or read from the bookings table — so a number
  is claimed exactly once, ever, regardless of later deletes. The
  increment is a single UPDATE statement, so Postgres's normal row lock
  on the company row serializes concurrent creates without needing an
  explicit transaction; verified with 5 simultaneous booking creations
  producing 5 distinct, gapless numbers. Also re-verified the original
  bug is gone: create → hard-delete → create again now produces a new,
  never-before-used number.
- **Per-minute pricing derives its quantity from `estimatedHours × 60`.**
  The schema (matching §8.1's field list exactly) has `estimatedHours` and
  `estimatedAcres`, no separate `estimatedMinutes`. Rather than add a
  field the spec doesn't list, `per_minute` bookings reuse `estimatedHours`
  converted to minutes. Flagged for review — if per-minute bookings turn
  out to need finer-grained input than "estimated hours," this is the
  place to revisit.
- **Booking attachments are local disk, not object storage** (per the
  explicit go-ahead to keep Phase 1 storage simple). Files land in
  `backend/uploads/booking-attachments/<companyId>/<bookingId>/` and are
  served back out via `express.static` at
  `/uploads/booking-attachments/...` — reachable by anyone with the URL,
  not just an authenticated request. Acceptable for a single pilot company
  testing internally; revisit (signed URLs, or real object storage) before
  wider rollout. `booking.upload.ts` is the only file that would need to
  change to swap this out later.
- **Creating a booking with a `machineId`/`driverId` already set does not
  additionally require `machine.assign`/`driver.assign`.** Creation is one
  action gated by `booking.create` alone; those two permissions gate the
  dedicated *post-creation* assign/reassign endpoints. In the current
  seed both roles that can create bookings (Owner, Manager) also hold
  `machine.assign`/`driver.assign`, so this doesn't currently create a
  gap in practice — flagged in case a future role split changes that.
- **`managerId` is validated as "an existing user in the company," not as
  "a user holding the Manager role specifically."** §8.1 lists Manager as
  a booking field without stating that constraint, and enforcing it would
  block an Owner from being recorded as a booking's manager in a small
  operation. Revisit if that turns out to be wrong.

## What was tested

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
