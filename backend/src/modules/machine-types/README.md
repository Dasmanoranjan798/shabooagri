# Machine Types module

## Purpose

Company-scoped lookup list of equipment categories (Tractor, Harvester,
Rotavator, Excavator, ...). A lookup table rather than a fixed enum
because §1 lists ~10 equipment types today and expects more over time —
adding one is a data insert, not a schema migration.

## Architecture

Same shape as every other master-data module in this batch:

```
machineType.routes.ts → machineType.controller.ts → machineType.service.ts → machineType.repository.ts (only Prisma import)
```

Tenant-scoping via `shared/db/scopedRepository.ts`, same as Villages.

## Database relationships

Owns: `machine_types`. Referenced by (not owned): `machines.machine_type_id`.

## Business rules encoded here

- Names unique per company; deleting a type still referenced by a machine
  is rejected by the FK constraint (409, via the shared `errorMiddleware`).

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/machine-types` | `operations.view` |
| GET | `/machine-types/:id` | `operations.view` |
| POST | `/machine-types` | `machine_type.manage` |
| PATCH | `/machine-types/:id` | `machine_type.manage` |
| DELETE | `/machine-types/:id` | `machine_type.manage` |

## Permissions required

`operations.view` and `machine_type.manage`, both seeded to Owner and
Manager only — see `modules/rbac/README.md`.

## Configuration

None.

## Important assumptions

None beyond the `operations.view` gating decision documented in the
Villages module's README (applies identically here).

## What was tested

Run live against the dev server + Postgres, together with Machines since
Machine creation depends on an existing Machine Type:

- `POST /machine-types` as Owner → 201; duplicate name as Owner → 409; as
  Driver → 403.
- `PATCH /machine-types/:id` as Driver → 403.
- `DELETE /machine-types/:id` as Driver → 403; as Owner while still
  referenced by a machine → 409 (FK constraint); as Owner once
  unreferenced → 204.

All synthetic data cleaned up afterward via direct SQL.
