# Jobs Module — Frontend & Execution UI

## Overview

The Jobs Frontend module implements the field execution layer (§7, §8.4, §11.6) for ShabooAgri. It tracks real-time equipment operations when a booking is dispatched (`ON_THE_WAY`).

## Components

- `JobsPage.tsx`: Jobs list screen with status tab filtering (`All`, `Not Started`, `Working`, `Paused`, `Completed`), toolbar search, desktop table view, and mobile card list view.
- `JobExecutionModal.tsx`: §11.6 Job In Progress field execution screen featuring:
  - Equipment & Customer Header (Machine reg #, Customer name, Village/location, Driver/Operator name).
  - Start Time & Live Running Time counter (`HH:mm:ss`), updating every second during `WORKING` state.
  - Action buttons: Start Job, Pause Job, Resume Job, Complete Job.
  - Quick action buttons: `+ Add Fuel`, `+ Add Photo`, `+ Add Note`.
  - Fuel Log Entries list and Photo Attachments grid.
  - Completion modal with completed acres input & optional actual hours override.

## API Integration

- `GET /jobs` — Lists jobs (scoped by role: company-wide for Owner/Manager, assigned jobs for Driver, own customer booking for Farmer).
- `GET /jobs/:id` — Fetches detailed job state.
- `POST /jobs/:id/start` — Transitions status to `WORKING` & sets `startTime`.
- `POST /jobs/:id/pause` — Transitions status to `PAUSED` & accumulates paused duration.
- `POST /jobs/:id/resume` — Transitions status to `WORKING` & records resume event.
- `POST /jobs/:id/complete` — Transitions status to `COMPLETED` & computes `actualHours`.
- `POST /jobs/:id/fuel-entries` — Logs litres & optional cost to `job_fuel_entries`.
- `POST /jobs/:id/photos` — Uploads multipart photo attachment with optional caption.
- `PATCH /jobs/:id` — Updates `completedAcres` or `notes`.

## Permission & Security Model

- Write actions (`start`, `pause`, `resume`, `complete`, `fuel-entries`, `photos`) require `job.update_status`.
- Ownership scoping ensures Drivers can only operate on jobs explicitly assigned to their driver profile.
- Farmers have zero permission to execute or modify job records.
