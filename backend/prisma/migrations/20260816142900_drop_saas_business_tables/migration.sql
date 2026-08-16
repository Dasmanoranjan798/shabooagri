-- AlterEnum
BEGIN;
CREATE TYPE "OtpPurpose_new" AS ENUM ('LOGIN', 'VERIFY', 'RESET');
ALTER TABLE "otp_codes" ALTER COLUMN "purpose" TYPE "OtpPurpose_new" USING ("purpose"::text::"OtpPurpose_new");
ALTER TYPE "OtpPurpose" RENAME TO "OtpPurpose_old";
ALTER TYPE "OtpPurpose_new" RENAME TO "OtpPurpose";
DROP TYPE "public"."OtpPurpose_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "contact_enquiries" DROP CONSTRAINT "contact_enquiries_assigned_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_feedbacks" DROP CONSTRAINT "customer_feedbacks_company_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_feedbacks" DROP CONSTRAINT "customer_feedbacks_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_company_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saas_customer_profiles" DROP CONSTRAINT "saas_customer_profiles_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saas_leads" DROP CONSTRAINT "saas_leads_assigned_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "saas_leads" DROP CONSTRAINT "saas_leads_created_by_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saas_payments" DROP CONSTRAINT "saas_payments_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sso_tokens" DROP CONSTRAINT "sso_tokens_company_id_fkey";

-- DropForeignKey
ALTER TABLE "sso_tokens" DROP CONSTRAINT "sso_tokens_saas_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sso_tokens" DROP CONSTRAINT "sso_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_log" DROP COLUMN "saas_user_id";

-- DropTable
DROP TABLE "contact_enquiries";

-- DropTable
DROP TABLE "customer_feedbacks";

-- DropTable
DROP TABLE "licenses";

-- DropTable
DROP TABLE "saas_customer_profiles";

-- DropTable
DROP TABLE "saas_leads";

-- DropTable
DROP TABLE "saas_payments";

-- DropTable
DROP TABLE "saas_users";

-- DropTable
DROP TABLE "sso_tokens";

-- DropEnum
DROP TYPE "ContactEnquiryStatus";

-- DropEnum
DROP TYPE "CustomerFeedbackStatus";

-- DropEnum
DROP TYPE "LicenseStatus";

-- DropEnum
DROP TYPE "SaasLeadStatus";

-- DropEnum
DROP TYPE "SaasPaymentStatus";

-- DropEnum
DROP TYPE "SaasUserStatus";

