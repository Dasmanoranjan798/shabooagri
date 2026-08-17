-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "plan_key" TEXT NOT NULL DEFAULT 'starter';

-- AlterTable
ALTER TABLE "platform_users" ADD COLUMN     "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machine_limit" INTEGER NOT NULL,
    "price_annual" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "announcement_enabled" BOOLEAN NOT NULL DEFAULT false,
    "announcement_message" TEXT,
    "purchasing_blocked" BOOLEAN NOT NULL DEFAULT false,
    "extra_machine_price" DECIMAL(10,2) NOT NULL DEFAULT 2000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_key_key" ON "pricing_plans"("key");
