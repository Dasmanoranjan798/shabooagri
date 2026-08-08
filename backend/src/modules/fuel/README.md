# Fuel module

## Purpose

Owns `job_fuel_entries` (§8.4's "Fuel Entry" quick action): itemized fuel
records against a job, each with litres, an optional cost, and who
recorded it. `jobs.fuel_used_litres` is a cached total derived from these
entries — this table is the source of truth, that column is a convenience
read.

## Architecture

```
fuel.service.ts → fuel.repository.ts (only file that imports Prisma)
```

**No controller or routes in this module.** Fuel entries only ever exist
in the context of a job, so the HTTP surface lives on Jobs —
`POST /jobs/:id/fuel-entries` and `GET /jobs/:id/fuel-entries` in
`job.controller.ts`, which calls into `fuel.service.ts` rather than
querying `job_fuel_entries` directly (the cross-module rule §3 requires,
applied here to a module that happens not to need its own routes yet).
If a company-wide fuel view (§8.6's Fuel Consumption chart, or a
standalone `/fuel` listing) is needed later, it's a routes/controller
addition to this same module, not a rewrite.

## Database relationships

Owns: `job_fuel_entries`. References (via FK, not owned): `jobs`,
`machines`, `users` (as recorder).

## Business rules encoded here

- No cross-module validation of `machineId` on entry creation — the only
  caller, `job.service.ts`, always passes the job's own `machineId`
  (never a client-supplied value), so it's already known valid by
  construction. If this module ever gains its own route accepting a
  client-supplied `machineId` directly, that validation would need to be
  added then.

## API endpoints

None — see "Architecture."

## Permissions required

N/A directly; access is gated at the Jobs routes that call into this
service (`job.update_status`, with the same ownership scoping as the rest
of Jobs — see `modules/jobs/README.md`).

## Configuration

None.

## Important assumptions

`litres` has no upper bound validation beyond "positive number" — no
sanity ceiling (e.g. flagging an implausibly large single entry) in
Phase 1.

## What was tested

Covered end-to-end as part of the Jobs module's test pass (adding a fuel
entry via `POST /jobs/:id/fuel-entries` and confirming `job.fuelUsedLitres`
updates to match) — see `modules/jobs/README.md`.
