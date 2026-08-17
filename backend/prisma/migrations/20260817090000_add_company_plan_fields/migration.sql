-- Additive, nullable columns only. Applied by hand for the same reason
-- as the prior two migrations (pre-existing shadow-db drift on unrelated
-- tables makes `prisma migrate dev` demand a full reset).

ALTER TABLE "companies" ADD COLUMN "plan_key" TEXT;
ALTER TABLE "companies" ADD COLUMN "machine_limit" INTEGER;
