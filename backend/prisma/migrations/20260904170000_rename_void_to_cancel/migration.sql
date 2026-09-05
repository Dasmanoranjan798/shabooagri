-- Terminology rename: Void -> Cancel. Hand-written as in-place RENAMEs (not
-- drop/add) so all historical cancelled invoices/payments/driver-payments and
-- their reasons/timestamps/actors are preserved.

-- Rename the InvoiceStatus enum value (existing 'VOIDED' rows become 'CANCELLED').
ALTER TYPE "InvoiceStatus" RENAME VALUE 'VOIDED' TO 'CANCELLED';

-- invoices
ALTER TABLE "invoices" RENAME COLUMN "void_reason" TO "cancel_reason";
ALTER TABLE "invoices" RENAME COLUMN "voided_at" TO "cancelled_at";
ALTER TABLE "invoices" RENAME COLUMN "voided_by" TO "cancelled_by";
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_voided_by_fkey" TO "invoices_cancelled_by_fkey";

-- payments
ALTER TABLE "payments" RENAME COLUMN "voided" TO "cancelled";
ALTER TABLE "payments" RENAME COLUMN "void_reason" TO "cancel_reason";
ALTER TABLE "payments" RENAME COLUMN "voided_at" TO "cancelled_at";
ALTER TABLE "payments" RENAME COLUMN "voided_by" TO "cancelled_by";
ALTER TABLE "payments" RENAME CONSTRAINT "payments_voided_by_fkey" TO "payments_cancelled_by_fkey";
ALTER INDEX "payments_voided_idx" RENAME TO "payments_cancelled_idx";

-- driver_payments (cancelled_by has no FK — plain audit column)
ALTER TABLE "driver_payments" RENAME COLUMN "voided" TO "cancelled";
ALTER TABLE "driver_payments" RENAME COLUMN "void_reason" TO "cancel_reason";
ALTER TABLE "driver_payments" RENAME COLUMN "voided_at" TO "cancelled_at";
ALTER TABLE "driver_payments" RENAME COLUMN "voided_by" TO "cancelled_by";
ALTER INDEX "driver_payments_voided_idx" RENAME TO "driver_payments_cancelled_idx";
