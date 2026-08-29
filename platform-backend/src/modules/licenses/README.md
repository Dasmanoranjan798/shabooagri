# Licenses — expiry enforcement (P2-7)

## Purpose
A subscription `License` is created/renewed as `ACTIVE` with an `expiryDate`
(see `payments.verifyPayment`). Nothing used to move a license to `EXPIRED`, so
an `ACTIVE` license whose expiry had passed stayed `ACTIVE` forever and the
provisioning/relaunch gates (which allow `status in [ACTIVE, EXPIRING_SOON]`)
kept passing indefinitely. This module adds the missing scheduled state
transition so license expiry is actually enforced.

## What the sweep does
`license.service.sweepExpiredLicenses()` runs one bulk, set-based update:

```
UPDATE licenses SET status = 'EXPIRED'
WHERE status IN ('ACTIVE','EXPIRING_SOON') AND expiry_date IS NOT NULL AND expiry_date < now
```

It returns the number of rows transitioned. Flipping `status -> EXPIRED` is the
enforcement: the existing `provisioning.controller` gates (`relaunch`, `status`)
already exclude `EXPIRED`, so an expired account can no longer relaunch/provision
— no parallel/duplicate enforcement path is introduced.

## When it runs
`scheduler/licenseExpiryScheduler.startLicenseExpiryScheduler()` is called from
`server.ts` on boot. It runs one sweep shortly after startup (so a just-lapsed
license is enforced promptly), then every
`LICENSE_EXPIRY_SWEEP_INTERVAL_MINUTES` (default 60). The interval timer is
`.unref()`ed so it never blocks process shutdown, and a module-level singleton
guard prevents a duplicate timer. A sweep error is logged (`[LicenseExpiry] …`)
and swallowed — a transient DB issue never crashes the API; the next tick retries.

## State transition
`ACTIVE` or `EXPIRING_SOON` with `expiry_date < now` → `EXPIRED`. No other field
is changed; no payment/invoice or other historical data is touched.

## Idempotency & safety
- Already-`EXPIRED` rows are excluded by the `WHERE` clause, so re-running is a
  no-op and doesn't churn `updatedAt`.
- Renewed/extended licenses have their `expiry_date` moved to the future on the
  same row, so they're evaluated by their current expiry and never mis-expired.
- The update is keyed only on each row's own status/expiry — one company's
  license can never affect another's (tenant-isolated).
- There are no trial/cancelled license states (the `LicenseStatus` enum is only
  `ACTIVE` / `EXPIRING_SOON` / `EXPIRED`), so none can be mis-handled.

## Activation
Enabled by default as part of the app lifecycle. Set
`LICENSE_EXPIRY_SWEEP_ENABLED=false` to disable. It is safe to run before
billing is "live": it only ever acts on real, already-past `expiry_date`s, and
stub/dev licenses are created with a one-year expiry, so nothing is expired
prematurely. When real billing is active, licenses simply carry real expiry
dates for the same sweep to enforce — no code change is needed to "go live".
