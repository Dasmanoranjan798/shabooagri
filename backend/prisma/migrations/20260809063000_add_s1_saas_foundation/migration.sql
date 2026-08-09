-- CreateEnum
CREATE TYPE "SaasUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SaasLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_CONVERSATION', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('REGISTERED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'LICENSE_ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED');

-- CreateEnum
CREATE TYPE "SaasPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ContactEnquiryStatus" AS ENUM ('UNREAD', 'IN_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CustomerFeedbackStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN "saas_user_id" UUID,
ALTER COLUMN "company_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "saas_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "SaasUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "saas_user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT DEFAULT 'WEBSITE',
    "status" "SaasLeadStatus" NOT NULL DEFAULT 'NEW',
    "follow_up_notes" TEXT,
    "assigned_admin_id" UUID,
    "created_by_saas_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "license_number" TEXT NOT NULL,
    "saas_user_id" UUID NOT NULL,
    "company_id" UUID,
    "payment_id" UUID,
    "start_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "LicenseStatus" NOT NULL DEFAULT 'REGISTERED',
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "saas_user_id" UUID NOT NULL,
    "license_id" UUID,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_signature" TEXT,
    "payment_reference" TEXT,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "gst_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2),
    "sgst_amount" DECIMAL(10,2),
    "igst_amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "SaasPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "gateway_payload" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_enquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactEnquiryStatus" NOT NULL DEFAULT 'UNREAD',
    "response_notes" TEXT,
    "assigned_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "saas_user_id" UUID NOT NULL,
    "company_id" UUID,
    "category" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT NOT NULL,
    "status" "CustomerFeedbackStatus" NOT NULL DEFAULT 'SUBMITTED',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saas_users_email_key" ON "saas_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saas_customer_profiles_saas_user_id_key" ON "saas_customer_profiles"("saas_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_number_key" ON "licenses"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_payment_id_key" ON "licenses"("payment_id");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_saas_user_id_fkey" FOREIGN KEY ("saas_user_id") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_customer_profiles" ADD CONSTRAINT "saas_customer_profiles_saas_user_id_fkey" FOREIGN KEY ("saas_user_id") REFERENCES "saas_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_leads" ADD CONSTRAINT "saas_leads_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_leads" ADD CONSTRAINT "saas_leads_created_by_saas_user_id_fkey" FOREIGN KEY ("created_by_saas_user_id") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_saas_user_id_fkey" FOREIGN KEY ("saas_user_id") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "saas_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_saas_user_id_fkey" FOREIGN KEY ("saas_user_id") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_enquiries" ADD CONSTRAINT "contact_enquiries_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_saas_user_id_fkey" FOREIGN KEY ("saas_user_id") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
