# Customers module

## Purpose

Farmer/customer business records (§8.1): name, village, contact info,
optional linked portal login. A Customer exists independently of portal
access — most will never log in; `userId` is only set when portal access
is explicitly granted (§6 Farmer/Customer role).

## Architecture

```
customer.routes.ts → customer.controller.ts → customer.service.ts → customer.repository.ts (only Prisma import)
```

Two cross-module service calls on create/update: `villages/village.service.getById()`
(required — every customer belongs to a village) and, if supplied,
`auth/auth.service.getUserForCompany()` (optional portal link). Neither
table is queried directly from this module.

## Database relationships

Owns: `customers`. References (via FK, not owned): `villages.id`
(required), `users.id` (optional, 1:1). Referenced by (not owned):
`bookings.customer_id`, `invoices.customer_id` (once Bookings/Payments exist).

## Business rules encoded here

- `villageId` must reference an existing village in the same company.
- `userId`, if supplied, must belong to an existing user in the same
  company, and can only be linked to one customer (schema unique
  constraint, 409 on conflict).

## API endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/customers` | `operations.view` |
| GET | `/customers/:id` | `operations.view` |
| POST | `/customers` | `customer.manage` |
| PATCH | `/customers/:id` | `customer.manage` |
| DELETE | `/customers/:id` | `customer.manage` |

## Permissions required

`operations.view` and `customer.manage`, both seeded to Owner and Manager
only.

## Configuration

None.

## Important assumptions

Same `operations.view` gating rationale as every other master-data module
(see Villages README). Worth flagging specifically here: once the Farmer
portal is built, a logged-in Farmer will need to read *their own*
customer/booking record — that will be an ownership-scoped query in
whichever module serves the portal (e.g. "where customer.user_id = the
caller"), not a grant of `operations.view` to the Farmer role, which would
expose every other customer's data too.

## What was tested

Run live against the dev server + Postgres:

- `POST /customers` with a valid `villageId` as Owner → 201; missing
  `villageId` → 400; bogus `villageId` → 404; bogus `userId` → 404; valid
  `userId` link → 201; a second customer linked to the same `userId` →
  409 (unique constraint); as Driver → 403; as Farmer → 403.
- `GET /customers` and `GET /customers/:id` as Owner → 200 with `village`
  joined in; as Farmer → 403 (`operations.view`).
- `PATCH /customers/:id` and `DELETE /customers/:id` as Driver → 403 on
  an existing record; as Owner on a nonexistent id → 404 in both cases;
  as Owner on an existing record → 200 / 204.

All synthetic customers and their linked villages/users created during
testing were deleted from `shabooagri_db` afterward.
