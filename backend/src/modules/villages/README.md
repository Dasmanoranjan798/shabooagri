# Villages module

## Purpose

Simple company-scoped lookup list of villages, used by Customers and
(later) Bookings so "which village" is a consistent reference rather than
free text that fragments in reports on typos (a decision flagged and
approved during schema review — see docs/ShabooAgri_Goal_Specification.md
§8.1 and the schema-review conversation).

## Architecture

```
village.routes.ts        → Express endpoints, no logic
  → village.controller.ts → parses request, calls service, shapes response
    → village.service.ts  → not-found handling; otherwise a thin pass-through
      → village.repository.ts → the only file that imports Prisma
```

Tenant-scoping (`findByIdScoped`/`updateScoped`/`deleteScoped`) is not
reimplemented here — it comes from `shared/db/scopedRepository.ts`, a
generic helper used by every master-data module so "does this row belong
to this company" is written once, not five times.

## Database relationships

Owns: `villages`. Referenced by (not owned): `customers.village_id`,
`bookings.village_id` (once Bookings exists).

## Business rules encoded here

- Deleting a village that's still referenced by a customer or booking is
  rejected by the database's foreign key constraint, translated to a
  clean 409 by the shared `errorMiddleware` (not handled here — see
  `middleware/error.middleware.ts`).
- Village names are unique per company (`@@unique([companyId, name])` in
  the schema) — a duplicate create/rename gets a 409 the same way.

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/villages` | `operations.view` |
| GET | `/villages/:id` | `operations.view` |
| POST | `/villages` | `village.manage` |
| PATCH | `/villages/:id` | `village.manage` |
| DELETE | `/villages/:id` | `village.manage` |

## Permissions required

`operations.view` and `village.manage` are both seeded to Owner and
Manager only; Driver and Farmer hold neither (§6: Driver/Farmer have no
access to company-wide operational data — see the RBAC module's README
for the full table and the reasoning behind gating reads at all).

## Configuration

None.

## Important assumptions

- `operations.view` is a new permission (not in the original §6 table)
  introduced specifically to gate list/detail reads on master-data
  modules to Owner/Manager, because §6 explicitly restricts what Driver
  and Farmer can see and neither role has any stated need to browse the
  full village list. Flagged for review — same pattern is used by every
  other master-data module built alongside this one.

## What was tested

Run live against the dev server + Postgres (not just `tsc`), as part of a
combined pass across all 5 master-data modules built in this batch.
Verified for this module specifically:

- `POST /villages` as Owner → 201; as Manager → 201; as Driver → 403; as
  Farmer → 403; missing `name` as Owner → 400.
- `GET /villages` and `GET /villages/:id` as Owner → 200; as Driver → 403;
  as Farmer → 403; with no token → 401; `:id` for a nonexistent village →
  404.
- `PATCH /villages/:id` as Owner → 200; as Driver → 403; nonexistent id →
  404.
- `DELETE /villages/:id` as Driver → 403; as Owner while still referenced
  by a customer → 409 (FK constraint, confirming the business rule above
  actually holds); as Owner once unreferenced → 204.

All synthetic data (test users, villages, and the customer used to prove
the FK-constraint case) was deleted afterward via direct SQL.
