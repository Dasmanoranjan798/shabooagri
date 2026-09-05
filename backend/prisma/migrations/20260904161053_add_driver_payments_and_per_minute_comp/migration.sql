-- AlterEnum
ALTER TYPE "CompensationType" ADD VALUE 'PER_MINUTE';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "per_minute_rate" DECIMAL(10,4);

-- CreateTable
CREATE TABLE "driver_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "earned_snapshot" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "period_from" TIMESTAMP(3),
    "period_to" TIMESTAMP(3),
    "notes" TEXT,
    "paid_by" UUID NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_payments_company_id_driver_id_idx" ON "driver_payments"("company_id", "driver_id");

-- CreateIndex
CREATE INDEX "driver_payments_voided_idx" ON "driver_payments"("voided");

-- AddForeignKey
ALTER TABLE "driver_payments" ADD CONSTRAINT "driver_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_payments" ADD CONSTRAINT "driver_payments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
