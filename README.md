# ShabooAgri

Standalone SaaS Business Operating System for agricultural equipment service
providers (tractor/harvester/rotavator hire, custom-hiring centers).

**This is a separate product from Shaboo Business OS.** It does not import,
depend on, or share a codebase or database with it. It is a sub-brand only
("A Shaboo Product" attribution in the footer) — its own repo, its own
Postgres database (`shabooagri_db`, owned by a dedicated `shabooagri` role),
its own domain.

Single source of truth for scope and design: [`docs/ShabooAgri_Goal_Specification.md`](docs/ShabooAgri_Goal_Specification.md).

## Stack

Node.js / Express / TypeScript / PostgreSQL (Prisma) / React (Vite, TypeScript).

## Structure

- `backend/` — Express API, one module folder per business capability under
  `src/modules/` (auth, rbac, bookings, jobs, machines, drivers, customers,
  employees, payments, expenses, fuel, maintenance, reports, settings,
  notifications). Each module keeps routes/controller/service/repository
  strictly separated — see that module's own README.
- `frontend/` — React app, feature folders under `src/features/` mirroring
  the backend modules, plus role-based layouts (`OwnerManagerLayout`,
  `DriverLayout`, `FarmerPortalLayout`) in `src/layouts/`.
- `docs/` — the goal specification and approved UI reference mockups.

## Status

**Functionally complete and live in production for a real pilot company — not yet fully hardened for onboarding paying customers at scale.**

"Compiles cleanly, passes lint, 100% test suite pass rate" (the old claim here) turned out not to mean "correct." A full hand audit on Aug 15–16, 2026 found 47 real defects across severity tiers — see [`SHABOOAGRI_CODEBASE_AUDIT.md`](SHABOOAGRI_CODEBASE_AUDIT.md)'s August 16 reconciliation notice for what was actually wrong and why automated checks missed it. All 12 Critical and all 14 High-severity findings are fixed and deployed as of Aug 16, 2026 (see `git log` on `master` for the commit-by-commit detail — every fix commit documents the defect and how it was verified live with disposable test data). **14 Medium and 7 Low findings remain open** — none block the current pilot, but worth closing before a wider rollout.

- **Backend**: Express/TypeScript/Prisma API with 20 modular business capabilities (Authentication, RBAC, Master Data, Bookings, Jobs, Payments & Invoicing, Fuel, Expenses, Maintenance, Settings, Dashboard Analytics, SaaS Control Plane, Provisioning, Staff Invites, and Security).
- **Frontend**: React (Vite/TypeScript) single-page application with responsive layouts (`OwnerManagerLayout`, `DriverLayout`, `FarmerPortalLayout`, `SaasLayout`), UI design system, operational workflows, driver portal, farmer portal, and SaaS public/admin surfaces. Compiles cleanly (`tsc -b`), builds for production (`vite build`).

## Local setup

Backend:
```
cd backend
cp .env.example .env   # fill in real secrets
npm install
npm run prisma:migrate
npm run dev             # http://localhost:4000, GET /health
```

Frontend:
```
cd frontend
npm install
npm run dev              # http://localhost:5173
```
