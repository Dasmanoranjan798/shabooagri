-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'STOPPED';

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pricing_method_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_driver_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_machine_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "work_description" TEXT,
ALTER COLUMN "pricing_method_id" DROP NOT NULL,
ALTER COLUMN "rate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "machine_id" DROP NOT NULL,
ALTER COLUMN "driver_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pricing_method_id_fkey" FOREIGN KEY ("pricing_method_id") REFERENCES "pricing_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
