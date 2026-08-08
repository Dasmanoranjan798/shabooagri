# Payments & Invoices Module — Frontend

## Overview

The Payments Frontend module implements the billing, collection, and receipt management layer (§8.5) for ShabooAgri. It tracks job invoices, paid amounts, authoritative balance calculations, multi-method payment recording (`CASH`, `UPI`, `BANK_TRANSFER`, `CREDIT`), and printable digital receipts.

## Components

- `PaymentsPage.tsx`: Main billing and payments ledger screen featuring KPI summary cards (Total Receivables, Total Collected, Outstanding Balance, Total Invoices), status filter tabs (`All`, `Unpaid`, `Partially Paid`, `Paid`), toolbar search, desktop table view, and mobile card list view.
- `ReceivePaymentModal.tsx`: Payment collection modal presenting the invoice summary, total amount, paid amount, prominent outstanding balance due, amount received input (validated against remaining balance), payment method selector, reference/transaction number input, and notes.
- `ReceiptModal.tsx`: Digital receipt and invoice details modal fetching structured receipt payloads from `GET /invoices/:id/receipt`, displaying company branding, customer & village details, job & machine info, itemized billing summary, payment collection logs, and a `Print Receipt` trigger.

## API Integration

- `GET /invoices` — Lists company invoices with customer, booking, and payment relations joined.
- `GET /invoices/:id` — Fetches detailed invoice record.
- `POST /invoices/:id/payments` — Records an atomic payment collection (`payment.receive` permission required).
- `GET /invoices/:id/receipt` — Fetches structured receipt payload with company branding, customer details, job execution stats, machine & driver details, and payment history.
- `GET /payments` — Lists company payments history.

## Permission & Security Model

- Invoice and payment reads are scoped via tenant caller scope (`Owner`/`Manager` access full company billing, `Farmer` views personal invoices only).
- Payment recording (`POST /invoices/:id/payments`) requires `payment.receive` permission (seeded on `Owner` and `Manager`).
- Balance calculations are strictly authoritative from the backend data model (`invoice.balanceAmount`), ensuring zero financial math drift.
