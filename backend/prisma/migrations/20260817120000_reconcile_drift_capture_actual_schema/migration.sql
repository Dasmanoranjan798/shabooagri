-- Reconciliation migration. Captures schema changes that were previously
-- applied to the live database via `prisma db push` (or equivalent direct
-- SQL) without ever being recorded as a migration file -- the drift flagged
-- in the last three migrations' comments (add_company_platform_user_id,
-- add_launch_tokens, add_company_plan_fields).
--
-- This file is NOT applied by `prisma migrate deploy` against the live
-- database -- every object it creates already exists there. It is recorded
-- via `prisma migrate resolve --applied` instead, so that:
--   1. `prisma migrate status` reports a clean, accurate history again, and
--   2. replaying every migration from scratch onto an empty database (as
--      done for a new dev environment, CI, or disaster recovery) produces
--      exactly the schema that is actually live today.
--
-- Generated via `prisma migrate diff` between (a) an empty database with
-- only the pre-existing 16 migrations replayed, and (b) schema.prisma,
-- which was confirmed byte-for-byte equivalent to the live database's
-- actual structure (`prisma migrate diff --from-schema-datamodel
-- schema.prisma --to-url <live>` produced zero output) before this file
-- was written. No data was read, written, or at risk in producing this.

-- CreateEnum
CREATE TYPE "JobExecutionMode" AS ENUM ('LIVE', 'MANUAL');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('HOURLY', 'MONTHLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_company_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_village_id_fkey";

-- DropIndex
DROP INDEX "idx_gst_cess_rules_hsn_sac_codes";

-- DropIndex
DROP INDEX "roles_company_id_system_key_key";

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "compensation_type" "CompensationType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN     "hourly_rate" DECIMAL(10,2),
ADD COLUMN     "monthly_salary" DECIMAL(10,2),
ADD COLUMN     "yearly_salary" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "gst_cess_rules" ALTER COLUMN "hsn_sac_codes" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "description" TEXT,
ALTER COLUMN "booking_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "execution_mode" "JobExecutionMode" NOT NULL DEFAULT 'LIVE';

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "system_key" DROP NOT NULL;

-- CreateTable
CREATE TABLE "customer_advances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "applied_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "received_by" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_advances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_advances_customer_id_idx" ON "customer_advances"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_company_id_name_key" ON "roles"("company_id", "name");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_advances" ADD CONSTRAINT "customer_advances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_advances" ADD CONSTRAINT "customer_advances_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_advances" ADD CONSTRAINT "customer_advances_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
