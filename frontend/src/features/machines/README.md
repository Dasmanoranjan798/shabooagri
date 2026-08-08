# Machines Module — Frontend

## Overview

The Machines Frontend module implements the equipment fleet inventory management layer (§8.3) for ShabooAgri. It tracks machine registrations, brands, models, status, hour meters, default driver assignments, fuel types, and service schedules.

## Components

- `MachinesPage.tsx`: Main equipment fleet screen featuring status tab filtering (`All`, `Available`, `Working`, `Repair`, `Offline`), toolbar search, desktop table view, and mobile card list view.
- `MachineFormModal.tsx`: Equipment registration and editing modal with Machine Type selection, registration number, brand, model, purchase year, fuel type, status, hour meter reading, assigned default driver, and insurance tracking fields.
- `MachineDetailModal.tsx`: Detailed machine inspection modal displaying operational metrics (hour meter, service due countdown), insurance info, and management actions (Edit, Delete).

## API Integration

- `GET /machines` — Lists company machines with `machineType` and `assignedDriver` relations joined.
- `GET /machines/:id` — Fetches detailed machine record.
- `POST /machines` — Registers a new machine (`machine.manage` permission).
- `PATCH /machines/:id` — Updates machine details or status (`machine.manage` permission).
- `DELETE /machines/:id` — Deletes a machine record (`machine.manage` permission).
- `GET /machine-types` — Fetches machine type options for the registration dropdown.

## Permission & Security Model

- View access is gated by `operations.view` permission (Owner/Manager).
- Create, Edit, and Delete actions are gated by `machine.manage` permission (Owner/Manager).
