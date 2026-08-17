-- Additive, nullable, single-column change. Applied by hand (not via
-- `prisma migrate dev`) because the shadow-database diff for this project
-- currently shows unrelated pre-existing drift across other tables
-- (employees, invoices, jobs, roles, staff_invites) between schema.prisma
-- and the recorded migration history -- almost certainly from an earlier
-- `prisma db push` that was never captured as a migration file. That drift
-- pre-dates this change and is out of scope here; flagged separately.
-- Running `migrate dev` would have required a full schema reset to
-- reconcile it, which is not acceptable against a live database with real
-- data. This file captures ONLY the new platformUserId field.

ALTER TABLE "companies" ADD COLUMN "platform_user_id" TEXT;
CREATE UNIQUE INDEX "companies_platform_user_id_key" ON "companies"("platform_user_id");
