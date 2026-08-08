# Employees Module — Frontend

## Overview

The Employees Frontend module implements the company staff records directory (§8.2) for ShabooAgri. It manages employee names, role titles/designations, mobile contact numbers, employment status (`ACTIVE`/`INACTIVE`), joined dates, and optional user login account linkage.

## Components

- `EmployeesPage.tsx`: Main staff directory screen featuring employment status filter tabs (`All`, `Active`, `Inactive`), toolbar search (filter by name, role title, phone), desktop table view, mobile card list view, and modal triggers.
- `EmployeeFormModal.tsx`: Staff member registration and editing modal with full name, role title/designation, phone number, employment status selector, and joined date picker.
- `EmployeeDetailModal.tsx`: Detailed staff profile inspection modal displaying employee identity, title, contact phone number, joined date, employment status badge, system account linkage status, and management action controls (Edit, Delete).

## API Integration

- `GET /employees` — Lists company employees ordered by name.
- `GET /employees/:id` — Fetches detailed employee record.
- `POST /employees` — Registers a new staff record (`employee.manage` permission).
- `PATCH /employees/:id` — Updates employee details or employment status (`employee.manage` permission).
- `DELETE /employees/:id` — Deletes an employee record (`employee.manage` permission).

## Permission & Security Model

- View access is gated by `operations.view` permission (Owner/Manager).
- Create, Edit, and Delete actions are gated by `employee.manage` permission (Owner/Manager).
