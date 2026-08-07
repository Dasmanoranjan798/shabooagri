# RBAC module

## Purpose

Answers "what is this role allowed to do." Phase 1 ships 4 fixed system
roles (Owner, Manager, Driver, Farmer) with a hardcoded permission
*assignment* (§6) but real, data-driven permission *enforcement* — there is
no role-builder UI or API to change who has what yet (Phase 2), but the
enforcement mechanism itself is the same one Phase 2 will keep using.

## Architecture

Deliberately the thinnest module in the codebase, because there is no
admin API in Phase 1:

```
middleware/rbac.middleware.ts (shared, not module-owned)
  → rbac.service.ts   → userHasPermission(roleId, permissionKey)
    → rbac.repository.ts → the only file that queries role_permissions
```

There is no `rbac.routes.ts`, `rbac.controller.ts`, or `rbac.validators.ts`
— nothing in Phase 1 exposes roles/permissions over HTTP for editing.
`middleware/rbac.middleware.ts` exports `requirePermission(key)`, a
reusable Express gate any module's routes apply after `authMiddleware`:

```ts
router.post("/", authMiddleware, requirePermission("booking.create"), controller.create);
```

`rbac.service.userHasPermission(roleId, permissionKey)` is also called
directly (not as route middleware) by modules that need a permission
check *inside* a conditional business flow rather than as a flat route
gate — currently `auth.service.register`, whose bootstrap logic can't use
`requirePermission` as route middleware because the very first registration
on a fresh company must succeed with no authenticated caller at all. Both
paths go through the same `rbac.service` function, which is the point:
one source of truth, not a route-level check and a separate inline check
that could drift apart.

## Database relationships

Reads (does not create/edit — see Status below): `roles`, `permissions`,
`role_permissions`.

## Business rules encoded here

- A permission check is a single query: does a `role_permissions` row
  exist for `(roleId, permissionKey)`. No role-name switch statement
  anywhere — granting or revoking a permission is a data change in
  `prisma/seed.ts` (or, from Phase 2 on, an admin API), never a code change.
- `requirePermission` must run after `authMiddleware` — it reads
  `req.user.roleId` and does not verify the token itself. Missing
  `req.user` → 401 (not authenticated); present but lacking the
  permission → 403.
- Farmer intentionally has zero rows in `role_permissions`. Their access
  (view only their own bookings/invoices) is enforced by *ownership*
  scoping inside each future module (e.g. "where customer.user_id = the
  caller"), not by a permission key — there is no permission that would
  make sense as "can view some bookings but not others."

## Permissions seeded per role (`prisma/seed.ts`, matching §6)

| Permission | Owner | Manager | Driver | Farmer |
|---|---|---|---|---|
| dashboard.view | ✓ | ✓ | | |
| booking.create | ✓ | ✓ | | |
| booking.edit | ✓ | ✓ | | |
| booking.delete | ✓ | | | |
| machine.assign | ✓ | ✓ | | |
| driver.assign | ✓ | ✓ | | |
| job.update_status | ✓ | ✓ | ✓ | |
| payment.receive | ✓ | ✓ | | |
| report.generate | ✓ | ✓ | | |
| user.manage | ✓ | ✓ | | |
| settings.manage | ✓ | | | |
| data.export | ✓ | | | |

Manager holding `user.manage` is not from the original §6 role
description — it's what `auth.service.register`'s previously-hardcoded
"Owner or Manager can register users" rule now resolves to under RBAC.
If Manager should not hold full user-management rights once real
user-management endpoints (edit/deactivate) exist, that's the point in
time to split registration into its own finer-grained permission instead
of reusing `user.manage`.

## Status

No routes/controllers/validators — intentional for Phase 1 (see
Architecture). `rbac.repository.ts` and `rbac.service.ts` are complete
and used by `middleware/rbac.middleware.ts` and by `auth.service.register`.

## What was tested

**Data check** — dumped every role's full permission set from the
database and confirmed it exactly matches the table above (Owner 12,
Manager 9, Driver 1, Farmer 0).

**HTTP check** — mounted a temporary diagnostic router (not committed,
deleted immediately after) with one route per representative permission
(`booking.create`, `payment.receive`, `user.manage`, `job.update_status`),
each gated by `authMiddleware` + `requirePermission`. Logged in as one
real user per role (Owner via password, Manager via password, Driver via
PIN, Farmer via OTP) and hit all 4 routes with each role's token:

| | booking.create | payment.receive | user.manage | job.update_status |
|---|---|---|---|---|
| Owner | 200 | 200 | 200 | 200 |
| Manager | 200 | 200 | 200 | 200 |
| Driver | 403 | 403 | 403 | 200 |
| Farmer | 403 | 403 | 403 | 403 |

Also confirmed a request with no `Authorization` header at all gets 401
before `requirePermission` is even reached. Results match §6 exactly —
notably Driver cannot receive payment, and Farmer cannot reach any
operational endpoint.

All synthetic users/tokens/OTP codes created for this testing were
deleted from `shabooagri_db` afterward.
