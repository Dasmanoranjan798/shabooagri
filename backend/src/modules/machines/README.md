# Machines module

## Purpose

The equipment fleet (§8.3): registration, brand/model, fuel type,
operational status, hour meter, insurance, and next-service tracking
fields. No maintenance *workflow* here (scheduling reminders, recording a
service visit) — that's the Maintenance module, not yet built; this module
only stores the machine record itself.

## Architecture

```
machine.routes.ts → machine.controller.ts → machine.service.ts → machine.repository.ts (only Prisma import)
```

`machine.service.ts` calls `machine-types/machineType.service.getById()`
to validate `machineTypeId` on create/update — a cross-module *service*
call, not a re-query of `machine_types` from this module's repository.
This is the pattern for any future cross-module reference: call the
owning module's service, never its repository or table directly.

## Database relationships

Owns: `machines`. References (via FK, not owned): `machine_types`,
`drivers` (`assigned_driver_id`, nullable — a default operator, not the
authoritative per-job assignment that Bookings/Jobs will manage later).

## Business rules encoded here

- `machineTypeId` must reference an existing machine type in the same
  company — checked at the service layer, giving a clean 404 from the
  Machine Types module's own `getById` rather than a raw DB error.
- `assignedDriverId` is **not** cross-validated the same way. The Drivers
  module didn't exist yet when this one was built (it's built immediately
  after, in this same batch) — an invalid `assignedDriverId` is currently
  only caught by the database's foreign key constraint (a generic 409 from
  `errorMiddleware`, not a friendly "driver not found" message). Flagged
  as a small follow-up once Drivers exists, matching the machineTypeId
  pattern above.
- `registrationNumber` unique per company; deleting a machine still
  referenced elsewhere (once Bookings/Jobs exist) will 409 the same way.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/machines` | `operations.view` |
| GET | `/machines/:id` | `operations.view` |
| POST | `/machines` | `machine.manage` |
| PATCH | `/machines/:id` | `machine.manage` |
| DELETE | `/machines/:id` | `machine.manage` |

## Permissions required

`operations.view` and `machine.manage`, both seeded to Owner and Manager
only.

## Configuration

None.

## Important assumptions

Same `operations.view` gating rationale as every other master-data module
(see Villages README) — plus the `assignedDriverId` validation gap noted
above.

## What was tested (Machine Types + Machines, same live session)

**Machine Types:** create as Owner → 201; duplicate name → 409; list/get
as Owner → 200; create as Driver → 403; list as Driver → 403; update
nonexistent id → 404.

**Machines:** create with a valid `machineTypeId` as Owner → 201, default
`status`/`fuelType`/`hourMeterReading` applied correctly; create with a
bogus `machineTypeId` → 404 via the cross-module service check; create
with missing `registrationNumber` → 400 (validator); duplicate
`registrationNumber` → 409; create as Driver → 403; create as Farmer →
403; `PATCH` status as Manager → 200; `PATCH`/`DELETE` as Driver → 403;
`GET` list/detail as Owner → 200 with `machineType` joined in; list as
Driver → 403; list as Farmer → 403 (`operations.view`); `DELETE` as Owner
→ 204.

All synthetic villages/machine types/machines created during testing were
deleted from `shabooagri_db` afterward.
