# Drivers Module — Frontend

## Overview

The Drivers Frontend module implements the equipment operator directory and profile management layer for ShabooAgri. It links employee records to operator profiles, managing license details, expiry tracking, and availability status.

## Components

- `DriversPage.tsx`: Main driver directory screen featuring availability filter tabs (`All`, `Available`, `On Job`, `Off Duty`), toolbar search box, desktop table view, and mobile card list view.
- `DriverFormModal.tsx`: Driver profile creation and editing modal with employee dropdown selection, license number, license expiry date picker, and availability status selector.
- `DriverDetailModal.tsx`: Detailed driver profile inspection modal displaying operator identity, title, contact phone number, license status (with expiry warning), and management actions (Edit, Delete).

## API Integration

- `GET /drivers` — Lists company drivers with linked employee relation joined.
- `GET /drivers/:id` — Fetches detailed driver profile.
- `POST /drivers` — Creates a driver profile for an employee (`driver.manage` permission).
- `PATCH /drivers/:id` — Updates driver profile, license, or availability (`driver.manage` permission).
- `DELETE /drivers/:id` — Deletes a driver profile (`driver.manage` permission).
- `GET /employees` — Fetches active employee directory for driver profile linkage.

## Permission & Security Model

- View access is gated by `operations.view` permission (Owner/Manager).
- Create, Edit, and Delete actions are gated by `driver.manage` permission (Owner/Manager).
- Ownership scoping ensures drivers cannot browse company-wide rosters; only permitted managers manage roster records.
