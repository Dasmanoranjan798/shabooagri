# Auth module

## Purpose

Authenticates a user (Owner, Manager, Driver, or Farmer) and issues the
JWTs every other module relies on to know who is calling. Per §5, three
login methods ship in Phase 1: Email/Mobile + OTP, Email + Password, and
PIN (for quick driver/field access). This module answers "who are you,"
never "what are you allowed to do" — permission checks belong to the RBAC
module, which is not built yet.

## Architecture

Strict layering per §3, one direction of dependency only:

```
auth.routes.ts        → Express endpoints, no logic
  → auth.controller.ts → parses request via auth.validators.ts, calls service, shapes response
    → auth.service.ts  → business rules (hashing, OTP lifecycle, JWT issuance/rotation)
      → auth.repository.ts → the only file in this module that imports Prisma
```

`middleware/auth.middleware.ts` (shared, not module-owned — every future
module will use it) verifies the access token on protected routes and
attaches `req.user = { id, companyId, roleId }`. It is stateless: it never
queries the database, so token *revocation* only takes effect for refresh
tokens (see below), not for an already-issued access token before it
naturally expires in 15 minutes.

## Database relationships

Owns: `users` (auth-relevant columns only — profile fields like `fullName`
belong conceptually to whichever module manages that user type),
`otp_codes`, `refresh_tokens`.

Reads (does not own): `companies`, `roles` — to resolve `company_id` and
validate `role_id` when creating a user.

## Business rules encoded here

- Passwords and PINs are hashed with bcrypt (10 rounds) — never compared
  or stored in plaintext.
- Refresh tokens are hashed with SHA-256 (not bcrypt) before being stored,
  because the DB needs to look one up by exact hash match. This is safe
  specifically because the input is a high-entropy signed JWT, not a
  low-entropy secret like a password — see the comment on `hashRefreshToken`
  in `auth.service.ts` for why bcrypt would be the wrong tool here.
- Every refresh **rotates**: the presented refresh token is revoked and a
  new one issued in the same call, so a leaked-but-already-used refresh
  token cannot be replayed. Verified in testing (see below).
- OTP codes expire after 5 minutes and allow at most 5 incorrect attempts
  before requiring a fresh request.
- Outside `NODE_ENV=production`, `POST /auth/otp/request` echoes the
  generated code back in the response body (`devOtp`) and logs it to the
  console. **This must be removed or hard-gated before any production
  deploy** — no SMS/email provider is wired up yet (`OTP_SMS_PROVIDER_KEY`
  / `OTP_EMAIL_PROVIDER_KEY` in `.env.example` are placeholders), so this
  is the only way to test the OTP flow today.
- `POST /auth/register` is gated by company bootstrap state, not a fixed
  auth requirement (§6 "Owner creates Manager/Driver/Customer accounts",
  applied without waiting for the full RBAC module):
  - If the company currently has **zero** users, registration is anonymous
    and the new user is **forced to Owner** regardless of the `roleKey`
    requested — there is no one yet who could authorize any other role.
  - If the company already has at least one user, the caller must present
    a valid access token belonging to an Owner or Manager (checked via
    `auth.middleware.ts`'s `optionalAuthMiddleware` + an inline role
    lookup in `auth.service.register`), or the request is rejected before
    a role is even resolved.
  - This closes the anonymous-signup hole from the first version of this
    module — self-registration as Owner/Manager/anything is no longer
    possible once an Owner exists.

## API endpoints

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Conditional — see bootstrap rule above | Create a user under the single Phase 1 company |
| POST | `/auth/otp/request` | No | Generate and (dev-only) return a login OTP for an email/mobile |
| POST | `/auth/otp/verify` | No | Verify OTP, issue tokens |
| POST | `/auth/login/password` | No | Email/mobile + password, issue tokens |
| POST | `/auth/login/pin` | No | Email/mobile + PIN, issue tokens |
| POST | `/auth/refresh` | No (refresh token in body) | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | No (refresh token in body) | Revoke a refresh token |
| GET | `/auth/me` | Yes (access token) | Return the caller's profile — used to prove `auth.middleware.ts` works |

## Permissions required

None enforced yet — RBAC is a separate, not-yet-built module. `/auth/me`
only requires a *valid* token, not any particular permission.

## Configuration

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (15m),
`JWT_REFRESH_EXPIRES_IN` (30d) — see `backend/.env.example`.

## Important assumptions

- Phase 1 is single-tenant (§2): `auth.repository.findSingleTenantCompany()`
  always fetches the one seeded company row rather than resolving a tenant
  from the request. This is the one function that will need to change when
  Phase 2 adds multi-company support — everything else already takes a
  `companyId` parameter.
- The 4 system roles and their permission set (`prisma/seed.ts`) are seed
  data required to satisfy `users.role_id`'s foreign key, matching the §6
  table exactly. This is **not** the RBAC module — there is no role/permission
  management API, and `auth.middleware.ts` does not check permissions at all.
- `users.email` / `users.mobileNumber` are unique per company, not globally,
  so the same email could exist under a different company once Phase 2
  multi-tenancy ships.

## What was tested (manually, against a running dev server + real Postgres)

1. `POST /auth/register` — created an Owner (email+password+mobile) → 201,
   tokens issued, response contained no password/PIN hash.
2. `POST /auth/register` — created a Driver (mobile+PIN, no email) → 201.
3. `POST /auth/register` — duplicate mobile number → 409.
4. `POST /auth/register` — no email and no mobile → 400 (validator rejects).
5. `POST /auth/login/password` — correct password → 200, tokens issued,
   `lastLoginAt` updated in the response.
6. `POST /auth/login/password` — wrong password → 401.
7. `POST /auth/login/pin` — correct PIN → 200.
8. `POST /auth/otp/request` — returned a `devOtp`.
9. `POST /auth/otp/verify` — wrong code → 401 (attempt counted).
10. `POST /auth/otp/verify` — correct code → 200, tokens issued.
11. `POST /auth/otp/verify` — same code reused → 400 (already consumed).
12. `GET /auth/me` with no `Authorization` header → 401.
13. `GET /auth/me` with a malformed token → 401.
14. `GET /auth/me` with a valid access token → 200, correct profile.
15. `GET /auth/me` with a *refresh* token in place of an access token → 401
    (rejected by the `type !== "access"` check).
16. `POST /auth/refresh` with a valid refresh token → 200, new access +
    refresh token pair.
17. New access token from #16 works on `/auth/me` → 200.
18. Reusing the original (pre-rotation) refresh token from #16 → 401
    (rotation correctly revoked it).
19. `POST /auth/logout` → 200, then reusing that same refresh token on
    `/auth/refresh` → 401 (revoked).

Bootstrap-gate round (after the fix above, starting from zero users again):

20. `POST /auth/register`, no token, `roleKey: "driver"`, on a company with
    zero users → 201, but the created user's actual role in the database
    is **Owner**, confirming the requested role is ignored on bootstrap.
21. `POST /auth/register`, no token, company now has one user → 401
    ("Authentication required to register additional users").
22. `POST /auth/register` with the bootstrapped Owner's access token,
    `roleKey: "driver"` → 201, role correctly assigned as Driver.
23. `POST /auth/register` with that Driver's own access token, attempting
    to register another user → 403 ("Only an Owner or Manager can
    register new users").
24. (Extra, beyond the required cases) Owner creates a Manager → 201;
    that Manager's own token then creates a Farmer → 201 — confirms
    Manager, not just Owner, can register users per the stated rule.

All synthetic test users, refresh tokens, and OTP codes created during
both rounds of testing were deleted from `shabooagri_db` afterward; the
pilot company was left with its seeded roles/permissions and zero users.
