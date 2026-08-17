# ShabooAgri

Standalone Business Operating System for agricultural equipment service
providers (tractor/harvester/rotavator hire, custom-hiring centers).

**This is a separate product from Shaboo Business OS.** It does not import,
depend on, or share a codebase or database with it. It is a sub-brand only
("A Shaboo Product" attribution in the footer) — its own repo, its own
domain.

Single source of truth for scope and design: [`docs/ShabooAgri_Goal_Specification.md`](docs/ShabooAgri_Goal_Specification.md).

## Stack

Node.js / Express / TypeScript / PostgreSQL (Prisma) / React (Vite, TypeScript).

## Two separate systems in this repo

- **The operational product** (`backend/` + `frontend/`) — what a CHC
  actually runs their business on: bookings, jobs, machines, payments,
  etc. One company per deployment today (Phase 1, single-tenant), reachable
  at each company's own subdomain (e.g. `pilot.shabooagri.com`).
- **The commercial platform layer** (`platform-backend/`, frontend to
  follow) — the public marketing/signup/billing side: register a
  business, pay, get a company provisioned. Deliberately isolated at
  every layer — separate database (`shabooagri_platform_db`, separate
  Postgres role), separate backend process/port, separate JWT secrets and
  token type. It reaches the operational backend through exactly one
  narrow, internal-only HTTP endpoint (`POST /internal/provision-company`)
  and nothing else — the operational app has no dependency on the
  platform layer being up, configured, or even existing. This split
  exists because an earlier version of this system had SaaS billing
  logic sharing a database with the operational schema, which let a
  license check end up gating every operational request; that's now
  structurally impossible.

## Structure

- `backend/` — Express API for the operational product, one module folder
  per business capability under `src/modules/` (auth, rbac, bookings, jobs,
  machines, drivers, customers, employees, payments, expenses, fuel,
  maintenance, reports, settings, internal). Each module keeps
  routes/controller/service/repository strictly separated — see that
  module's own README.
- `frontend/` — React app for the operational product, feature folders
  under `src/features/` mirroring the backend modules, plus role-based
  layouts (`AppLayout` for Owner/Manager, `DriverLayout`, `FarmerPortalLayout`)
  in `src/layouts/`.
- `platform-backend/` — Express API for the commercial platform layer
  (marketing/signup/billing/admin). Same module conventions as `backend/`,
  entirely separate database and process.
- `docs/` — the goal specification and approved UI reference mockups.
  Several historical acceptance/audit reports also live here; treat
  `SHABOOAGRI_CODEBASE_AUDIT.md`'s reconciliation notices as the most
  current account of what has and hasn't actually been verified.

## Status

**Operational product: functionally complete, end-to-end tested against
the live server and real Postgres, and deployed in production with valid
HTTPS (`shabooagri.com`, Let's Encrypt, auto-renewing).** All 4 pricing
methods, the full Owner/Manager/Driver/Farmer workflow, and dashboard
metrics have been verified live, not just via automated tests. See
`SHABOOAGRI_CODEBASE_AUDIT.md` for the full defect-remediation history —
all Critical/High findings from that audit are fixed. Two things remain
outside engineering's ability to close: a real-browser pass on a small
queued list of UI findings (needs a browser tool), and piloting with a
real equipment-service business (a business step, not a code one).

**Commercial platform layer: backend stage complete** (database, auth,
Razorpay integration with a working stub mode, automatic company
provisioning) and verified end-to-end. Frontend (marketing site,
register/login, owner admin dashboard) is the next stage of work.

## Local setup

Operational backend:
```
cd backend
cp .env.example .env   # fill in real secrets
npm install
npm run prisma:migrate
npm run dev             # http://localhost:4000, GET /health
```

Operational frontend:
```
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Platform backend:
```
cd platform-backend
cp .env.example .env   # fill in real secrets; INTERNAL_API_KEY must match backend/.env
npm install
npm run prisma:migrate
npm run dev              # http://localhost:4010, GET /health
```
