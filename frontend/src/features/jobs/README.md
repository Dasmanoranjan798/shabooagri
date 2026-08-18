# Job Cards Module — Frontend & Execution UI

## Overview

Implements the Booking → Job Card → Invoice flow's field-execution layer.
A Job Card is created automatically the instant a Booking is saved (no
separate "convert to job" step, no dispatch status to walk through first)
and shows "Ready to Start" once a machine/driver are assigned, or
"Awaiting Machine" until then.

## Components

- `JobsPage.tsx`: Job Cards list — one row per card (Farmer, Village,
  Machine/Work description, status badge), card-state filter tabs
  (Awaiting Machine / Ready to Start / In Progress / Completed /
  Cancelled), toolbar search, desktop table + mobile card views. Tapping
  an "Awaiting Machine" card opens the Booking's machine/driver assignment
  UI; anything else opens the Live Job task.
- `JobExecutionModal.tsx`: the Live Job screen, on the shared task-tray
  system. Header (Farmer name, status pill, Village/machine/start-time),
  live `HH:mm:ss` counter, live price display (mirrors
  `lib/pricing.ts`'s `calculateAmount`, the client-side twin of the
  backend's pricing calculator), a pricing-assignment step gating Start if
  the booking has no pricing yet, a Pause/Start toggle + independent Stop
  button, a mandatory reason overlay before Resume, a Stop confirmation
  (counter keeps ticking underneath it — only a confirmed Yes freezes it),
  a Submit confirmation (the actual point of no return — locks the job,
  generates the invoice), and a completion screen (Customer/Village/
  Duration/Rate/Total). Quick actions (`+ Add Fuel`, `+ Add Photo`,
  `+ Add Note`) stay available through Stop.
- `ManualJobEntryModal.tsx`: unaffected by any of the above — a separate,
  always-COMPLETED after-the-fact entry path that never goes through
  Start/Pause/Stop/Submit.

## API Integration

- `GET /jobs` — Lists jobs (scoped by role: company-wide for Owner/
  Manager, assigned jobs for Driver, own customer's bookings for Farmer).
  Each item carries `isReadyToStart` (machine + driver assigned; pricing
  is deliberately excluded from this signal — it's picked on the Live Job
  screen itself, after the card is tapped).
- `GET /jobs/:id` — Fetches detailed job state.
- `POST /jobs/:id/start` — WORKING; rejects if machine/driver or
  pricing/rate aren't set yet.
- `POST /jobs/:id/pause` — PAUSED.
- `POST /jobs/:id/resume` — WORKING; `note` is now required (not
  optional) — the reason for the delay.
- `POST /jobs/:id/stop` — WORKING/PAUSED → STOPPED; freezes
  `endTime`/`actualHours`. No invoice yet.
- `POST /jobs/:id/submit` — STOPPED-only → COMPLETED; generates the
  invoice, locks the job to Owner-only edits. (There is no `/complete`
  endpoint anymore — it split into stop + submit.)
- `POST /jobs/:id/fuel-entries` — Logs litres & optional cost.
- `POST /jobs/:id/photos` — Uploads multipart photo attachment.
- `PATCH /jobs/:id` — Updates `completedAcres` or `notes`.
- `PATCH /bookings/:id/pricing` — sets `pricingMethodId`/`rate` on the
  booking; called from the Live Job screen's pre-Start pricing step, not
  from this module's own routes, but tightly coupled to it.

## Permission & Security Model

- Write actions (`start`, `pause`, `resume`, `stop`, `submit`,
  `fuel-entries`, `photos`, plus the booking's `pricing` endpoint) all
  require `job.update_status` — Driver holds this too, deliberately, so a
  Driver can run the whole flow including setting pricing.
- Ownership scoping ensures Drivers can only operate on jobs explicitly
  assigned to their driver profile.
- Farmers have zero permission to execute or modify job records.
