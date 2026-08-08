# Expenses Module

## Purpose

Tracks operational business expenses (fuel & oil, spare parts, driver allowances, machine maintenance, etc.), categorized and optionally linked to a specific machine (§4, §11.2).

## Architecture

```
expense.routes.ts → expense.controller.ts → expense.service.ts → expense.repository.ts
```

## Database Relationships

Owns: `expenses`, `expense_categories`.
References: `machines.id` (optional), `users.id` (`incurred_by`).

## API Endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/expenses/categories` | `operations.view` |
| GET | `/expenses` | `operations.view` |
| GET | `/expenses/:id` | `operations.view` |
| POST | `/expenses` | `operations.view` |
| PATCH | `/expenses/:id` | `operations.view` |
| DELETE | `/expenses/:id` | `operations.view` |

## Permissions Required

`operations.view` permission for read and record management (Owner & Manager roles).
