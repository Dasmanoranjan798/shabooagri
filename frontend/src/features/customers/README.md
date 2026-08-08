# Customers Module — Frontend

## Overview

The Customers Frontend module implements the customer/farmer business records management layer (§8.1) for ShabooAgri. It tracks customer names, village linkages, contact numbers, addresses, plot details, notes, and optional linked portal accounts.

## Components

- `CustomersPage.tsx`: Main customer directory screen featuring toolbar search (filter by name, village, phone, address), desktop table view, mobile card list view, and modal triggers.
- `CustomerFormModal.tsx`: Customer registration and editing modal with customer name, village dropdown selection, phone number, address/field location, and notes.
- `CustomerDetailModal.tsx`: Detailed customer profile inspection modal displaying customer identity, village, phone, address, notes, portal link status, and quick action controls (Edit, Delete, + New Booking trigger).

## API Integration

- `GET /customers` — Lists company customers with `village` relation joined.
- `GET /customers/:id` — Fetches detailed customer record.
- `POST /customers` — Registers a new customer (`customer.manage` permission).
- `PATCH /customers/:id` — Updates customer profile details (`customer.manage` permission).
- `DELETE /customers/:id` — Deletes a customer record (`customer.manage` permission).
- `GET /villages` — Fetches active village directory for customer location linkage.

## Permission & Security Model

- View access is gated by `operations.view` permission (Owner/Manager).
- Create, Edit, and Delete actions are gated by `customer.manage` permission (Owner/Manager).
