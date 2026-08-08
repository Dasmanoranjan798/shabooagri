# Expenses Module — Frontend

## Overview

The Expenses Frontend module implements the operational business expenses management layer (§4, §11.2) for ShabooAgri. It tracks operational outflow, spare parts, driver allowances, machine maintenance expenses, and expense category classification.

## Components

- `ExpensesPage.tsx`: Main operational expense ledger screen featuring KPI summary cards (Total Outflow, Machinery Expenses, General Operations, Total Entries Count), category filter tabs (`All Categories`, plus dynamically loaded categories), toolbar search, desktop table view, mobile card list view, and modal triggers.
- `ExpenseFormModal.tsx`: Expense recording and editing modal with Category selection, Expense Amount input, optional Machine Link dropdown, Expense Date picker, and Description/Remarks.
- `ExpenseDetailModal.tsx`: Detailed expense record inspection modal displaying expense date, category, amount, machine linkage, recorder user name, description, and management action controls (Edit, Delete).

## API Integration

- `GET /expenses` — Lists company expenses ordered by expense date descending.
- `GET /expenses/:id` — Fetches detailed expense record.
- `POST /expenses` — Records a new operational expense (`operations.view` permission).
- `PATCH /expenses/:id` — Updates expense record (`operations.view` permission).
- `DELETE /expenses/:id` — Deletes an expense record (`operations.view` permission).
- `GET /expenses/categories` — Lists company expense categories.

## Permission & Security Model

- Access to view, create, edit, and delete expense records is gated by `operations.view` permission (Owner & Manager roles).
- Expenses are strictly scoped per company in the multi-tenant database model.
