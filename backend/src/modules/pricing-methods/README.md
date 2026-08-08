# Pricing Methods module

## Purpose

§8.2's data-driven pricing engine: Per Hour, Per Minute, Per Acre, Per Job
(fixed), Minimum Charge, Custom Rate. Adding a 7th method later is a data
insert in `prisma/seed.ts` (or a future admin API), never a change to
Booking/Job/Invoice code that consumes a price — that consuming code
should key off `unit` (hour/minute/acre/null), not off which method it is
by name.

## Architecture

The thinnest module yet — read-only, no service-layer decisions:

```
pricingMethod.routes.ts → pricingMethod.controller.ts → pricingMethod.service.ts → pricingMethod.repository.ts (only Prisma import)
```

No validators — there's no request body to validate on a plain list GET.

## Database relationships

Owns (read-only in Phase 1): `pricing_methods`. Will be referenced by
`bookings.pricing_method_id` once Bookings exists.

## Business rules encoded here

None yet — this module only exposes what `prisma/seed.ts` put in the
table. The actual "turn `(unit, rate, quantity)` into an amount" logic
described in §8.2 belongs to whichever module first needs it (Bookings),
not here.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/pricing-methods` | None beyond authentication |

## Permissions required

Authentication only — deliberately **not** gated by `operations.view` the
way other master-data modules are. Pricing method labels aren't sensitive
business data the way a customer list or employee roster is; a Farmer
viewing their own invoice needs to be able to render "Per Acre" too.
Flagged as the one intentional exception to this batch's usual read-gating
rule.

## Configuration

None.

## Important assumptions

`isActive` exists on the schema for future use (a company disabling a
method it doesn't use) but nothing in Phase 1 sets it to `false` — the
seed always creates all 6 active.

## What was tested

Seeded all 6 methods for the pilot company (`per_hour`, `per_minute`,
`per_acre`, `per_job`, `minimum_charge`, `custom`) and verified via direct
DB query. `GET /pricing-methods` as each of the 4 roles (Owner, Manager,
Driver, Farmer) → 200 for all four, confirming no permission gate blocks
any authenticated role. `GET /pricing-methods` with no token → 401.
