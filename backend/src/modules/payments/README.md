# Payments & Invoices module

**Purpose:** Manages invoice generation from completed jobs, tracks billing balances, records multi-method payments against invoices, enforces tenant and role-based data visibility, and structures receipt payloads (§8.5).

**Status:** Fully implemented (routes, controllers, services, repositories, monotonic counters, transactional payment handling, and tests).

**Owns tables:** `invoices`, `payments`

**Spec reference:** `docs/ShabooAgri_Goal_Specification.md` §8.5, §6, §11.7

---

## Business Rules & Implementation Decisions

### 1. Invoice Generation on Job Completion
- When a `Job` transitions to `COMPLETED`, `paymentService.createInvoiceForCompletedJob` automatically creates an `Invoice` for that booking.
- `totalAmount` is calculated using `pricing-calculator.ts` with the booking's `rate` and the job's **ACTUAL** values (`actualHours`, `completedAcres`), matched to `pricingMethod.unit`:
  - `unit === 'hour'`: `quantity = job.actualHours`
  - `unit === 'minute'`: `quantity = job.actualHours * 60`
  - `unit === 'acre'`: `quantity = job.completedAcres`
  - `unit === null` (flat methods: `per_job`, `minimum_charge`, `custom`): `quantity = null`, `totalAmount = rate`.
- **Assumption for `minimum_charge` & `custom` methods:** Where no clean unit quantity applies, `rate` represents the baseline flat job amount.

### 2. Strictly Monotonic Invoice Numbers
- `invoiceNumber` (e.g. `INV-000001`) is generated sequentially per company backed by `companies.next_invoice_number`.
- The increment is an atomic UPDATE (`nextInvoiceNumber: { increment: 1 }`). It is never read-and-recomputed from the `invoices` table. Even if an invoice is hard-deleted, its number is never reused.

### 3. Transactional Payment Recording & Status Lifecycle
- Payments are recorded within an atomic database transaction (`prisma.$transaction`).
- The payment write and the invoice update (`paidAmount`, `balanceAmount`, `status`) happen together atomically without database triggers (consistent with architectural decision #4).
- `status` lifecycle:
  - `UNPAID` (`paidAmount == 0`)
  - `PARTIALLY_PAID` (`0 < paidAmount < totalAmount`)
  - `PAID` (`paidAmount == totalAmount`)
- Payment amounts exceeding remaining balance are rejected with HTTP 400.

### 4. Supported Payment Methods
- `CASH`
- `UPI`
- `BANK_TRANSFER`
- `CREDIT`

### 5. RBAC & Access Controls
- Payment recording (`POST /invoices/:id/payments`) requires `payment.receive` permission (seeded on `Owner` and `Manager`).
- Invoice and Payment reads are scoped via `resolveCallerScope`:
  - `Owner` / `Manager`: full company access.
  - `Farmer` / `Customer`: view-only access restricted to their own invoices and payments.
  - `Driver`: financial access restricted (returns empty list).

### 6. Structured Receipt Rationale
- Endpoint `GET /invoices/:id/receipt` provides a structured, complete JSON representation containing company branding snapshot, invoice status, customer & village details, job execution stats, machine & driver details, and payment history.
- Returning structured JSON rather than a pre-rendered PDF allows web and mobile clients (and print views) maximum flexibility to render high-resolution branded receipts on demand.
