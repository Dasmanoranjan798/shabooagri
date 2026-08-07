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

Phase 1 (MVP) scaffold only: repo structure, full Prisma schema, and initial
migration are in place and verified (migration applies cleanly, backend boots
with a working `/health` check against the database, frontend builds and
serves). No feature/business logic has been implemented yet — modules are
empty except for their README.

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
