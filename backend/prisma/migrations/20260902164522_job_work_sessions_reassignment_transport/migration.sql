-- CreateEnum
CREATE TYPE "JobAssignmentField" AS ENUM ('MACHINE', 'DRIVER');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "transport_amount" DECIMAL(10,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "job_work_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_sec" INTEGER,
    "started_by" UUID NOT NULL,
    "ended_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assignment_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "field" "JobAssignmentField" NOT NULL,
    "old_machine_id" UUID,
    "new_machine_id" UUID,
    "old_driver_id" UUID,
    "new_driver_id" UUID,
    "reason" TEXT NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_assignment_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_transport_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "transport_type_id" UUID,
    "transport_type_name" TEXT NOT NULL,
    "trips" INTEGER NOT NULL,
    "rate_per_trip" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "job_transport_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_work_sessions_company_id_job_id_idx" ON "job_work_sessions"("company_id", "job_id");

-- CreateIndex
CREATE INDEX "job_work_sessions_company_id_driver_id_idx" ON "job_work_sessions"("company_id", "driver_id");

-- CreateIndex
CREATE INDEX "job_work_sessions_company_id_machine_id_idx" ON "job_work_sessions"("company_id", "machine_id");

-- CreateIndex
CREATE INDEX "job_assignment_changes_company_id_job_id_idx" ON "job_assignment_changes"("company_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_types_company_id_name_key" ON "transport_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "job_transport_charges_company_id_job_id_idx" ON "job_transport_charges"("company_id", "job_id");

-- AddForeignKey
ALTER TABLE "job_work_sessions" ADD CONSTRAINT "job_work_sessions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_sessions" ADD CONSTRAINT "job_work_sessions_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_sessions" ADD CONSTRAINT "job_work_sessions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignment_changes" ADD CONSTRAINT "job_assignment_changes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_transport_charges" ADD CONSTRAINT "job_transport_charges_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_transport_charges" ADD CONSTRAINT "job_transport_charges_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
