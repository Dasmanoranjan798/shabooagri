# Drivers module

## Purpose

Driver-specific fields (license, availability) layered onto an existing
Employee record. A Driver is not a standalone person record — it's what
makes an Employee eligible to be assigned to machines/bookings/jobs later.

## Architecture

```
driver.routes.ts → driver.controller.ts → driver.service.ts → driver.repository.ts (only Prisma import)
```

`driver.service.ts` calls `employees/employee.service.getById()` to
validate `employeeId` — the same cross-module-service pattern used by
Machines → Machine Types and Employees → Auth.

## Database relationships

Owns: `drivers`. References (via FK, not owned): `employees.id` (1:1,
unique — one employee can have at most one driver profile). Referenced by
(not owned): `machines.assigned_driver_id`, and later `bookings`/`jobs`.

## Business rules encoded here

- `employeeId` must reference an existing employee in the same company —
  checked via the Employees module's service, giving a clean 404 instead
  of a raw DB error.
- Creating a second Driver profile for the same employee is rejected by
  the schema's unique constraint on `drivers.employee_id` (409).

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/drivers` | `operations.view` |
| GET | `/drivers/:id` | `operations.view` |
| POST | `/drivers` | `driver.manage` |
| PATCH | `/drivers/:id` | `driver.manage` |
| DELETE | `/drivers/:id` | `driver.manage` |

## Permissions required

`operations.view` and `driver.manage`, both seeded to Owner and Manager
only. Note this is distinct from `driver.assign` (assigning a driver to a
specific booking, Manager's day-to-day job) — `driver.manage` is
maintaining the driver's own profile record.

## Configuration

None.

## Important assumptions

Same `operations.view` gating rationale as every other master-data module
(see Villages README).

## What was tested

Run live against the dev server + Postgres, together with Employees (see
`modules/employees/README.md` for that half). For Drivers specifically:

- `POST /drivers` with a valid `employeeId` as Owner → 201, default
  `availabilityStatus` = `AVAILABLE`; bogus `employeeId` → 404 via the
  cross-module check; a second driver profile for the same employee →
  409 (unique constraint); as Driver → 403.
- `PATCH /drivers/:id` (e.g. `availabilityStatus`) as Manager → 200; as
  Driver → 403.
- `GET /drivers` and `GET /drivers/:id` as Owner → 200; as Driver → 403
  (`operations.view` — a driver cannot browse the full driver roster);
  with no token → 401.
- `DELETE /drivers/:id` as Driver → 403; as Owner → 204.

All synthetic employees/drivers/linked users created during testing were
deleted from `shabooagri_db` afterward.
