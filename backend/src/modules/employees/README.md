# Employees module

## Purpose

Staff records (Manager, Mechanic, Office Staff, etc.) as a business
entity, independent of login access. An Employee is a company record;
having a login account is optional and separate — captured by the
nullable `userId` link, not by every staff member needing an Auth account.

## Architecture

```
employee.routes.ts → employee.controller.ts → employee.service.ts → employee.repository.ts (only Prisma import)
```

`employee.service.ts` calls `auth/auth.service.getUserForCompany()` to
validate an optionally-supplied `userId` — a cross-module *service* call
(Auth owns `users`), not a query against `users` from this module.

## Database relationships

Owns: `employees`. References (via FK, not owned): `users.id` (optional,
1:1 — enforced unique at the schema level so one login account can't be
linked to two employee records). Referenced by (not owned): `drivers.employee_id`.

## Business rules encoded here

- `userId`, if supplied, must belong to an existing user in the same
  company — checked via Auth's service, not re-queried here.
- Linking the same `userId` to two employees is rejected by the schema's
  unique constraint on `employees.user_id` (409).

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/employees` | `operations.view` |
| GET | `/employees/:id` | `operations.view` |
| POST | `/employees` | `employee.manage` |
| PATCH | `/employees/:id` | `employee.manage` |
| DELETE | `/employees/:id` | `employee.manage` |

## Permissions required

`operations.view` and `employee.manage`, both seeded to Owner and Manager
only.

## Configuration

None.

## Important assumptions

Same `operations.view` gating rationale as every other master-data module
(see Villages README).

## What was tested

Run live against the dev server + Postgres, together with Drivers since
Driver creation depends on an existing Employee:

- `POST /employees` as Owner → 201; missing `name` → 400; bogus `userId`
  → 404 (via Auth's `getUserForCompany`); valid `userId` link → 201;
  second employee linked to the same `userId` → 409 (schema unique
  constraint); as Driver → 403.
- `GET /employees` and `GET /employees/:id` as Owner → 200; as Driver →
  403; as Farmer → 403.
- `PATCH /employees/:id` and `DELETE /employees/:id` as Driver → 403; as
  Owner → 200 / 204 (delete confirmed once no Driver profile referenced
  the employee).

All synthetic data cleaned up afterward via direct SQL.
