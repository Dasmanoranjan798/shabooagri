-- AlterTable: Add is_cess_enabled to companies
ALTER TABLE "companies" ADD COLUMN "is_cess_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add CESS and GST fields to expenses
ALTER TABLE "expenses" ADD COLUMN "cess_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN "cess_rate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN "hsn_sac_code" TEXT,
ADD COLUMN "is_gst_applicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_itc_blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tax_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN "tax_rate" DECIMAL(5,2) DEFAULT 0;

-- AlterTable: Add CESS and HSN/SAC fields to invoices
ALTER TABLE "invoices" ADD COLUMN "cess_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN "cess_rate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN "hsn_sac_code" TEXT;

-- CreateTable: gst_cess_rules
CREATE TABLE "gst_cess_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "hsn_sac_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cess_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "specific_cess_amount" DECIMAL(10,2) DEFAULT 0,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_cess_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "gst_cess_rules_company_id_is_active_idx" ON "gst_cess_rules"("company_id", "is_active");
CREATE INDEX "idx_gst_cess_rules_hsn_sac_codes" ON "gst_cess_rules" USING GIN ("hsn_sac_codes");

-- AddForeignKey
ALTER TABLE "gst_cess_rules" ADD CONSTRAINT "gst_cess_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
