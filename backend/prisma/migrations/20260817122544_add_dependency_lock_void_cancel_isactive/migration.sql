-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'VOIDED';

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by" UUID;

-- AlterTable
ALTER TABLE "villages" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "payments_voided_idx" ON "payments"("voided");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
