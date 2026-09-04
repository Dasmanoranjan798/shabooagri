-- Remove the standalone Village master; make locality/address an attribute of
-- the person (Customer) and capture historical village names in-place so no
-- data is lost. Order: add new columns -> backfill from villages -> drop FKs
-- -> drop old columns -> drop the villages table. Every step is non-destructive
-- until the final drops, and those only run after the data has been copied.

-- 1. New address attributes on the person record (all nullable).
ALTER TABLE "customers" ADD COLUMN "village" TEXT;
ALTER TABLE "customers" ADD COLUMN "post_office" TEXT;
ALTER TABLE "customers" ADD COLUMN "block" TEXT;
ALTER TABLE "customers" ADD COLUMN "district" TEXT;
ALTER TABLE "customers" ADD COLUMN "state" TEXT;
ALTER TABLE "customers" ADD COLUMN "pin" TEXT;

-- 2. Locality text captured on a farmer invite (copied to the Customer on accept).
ALTER TABLE "staff_invites" ADD COLUMN "village" TEXT;

-- 3. Backfill the person's locality from the village they were linked to.
UPDATE "customers" c SET "village" = v."name"
  FROM "villages" v WHERE c."village_id" = v."id";

UPDATE "staff_invites" si SET "village" = v."name"
  FROM "villages" v WHERE si."village_id" = v."id";

-- 4. Preserve each booking's point-in-time work location: where the booking had
--    no explicit location override, fall back to the village name it referenced.
UPDATE "bookings" b SET "location" = v."name"
  FROM "villages" v
  WHERE b."village_id" = v."id" AND (b."location" IS NULL OR b."location" = '');

-- 5. Drop the foreign keys to the villages table.
ALTER TABLE "customers" DROP CONSTRAINT "customers_village_id_fkey";
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_village_id_fkey";
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_village_id_fkey";

-- 6. Drop the now-obsolete village_id columns.
ALTER TABLE "customers" DROP COLUMN "village_id";
ALTER TABLE "bookings" DROP COLUMN "village_id";
ALTER TABLE "staff_invites" DROP COLUMN "village_id";

-- 7. Drop the standalone Village master table.
DROP TABLE "villages";
