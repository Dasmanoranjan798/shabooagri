-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "minimum_charge" DECIMAL(10,2);

-- Retire the standalone `minimum_charge` pricing method: per the business
-- decision, "Minimum Charge" is now a floor attribute on metered methods
-- (bookings.minimum_charge), not a flat-fee pricing method. Delete only the
-- rows NOT referenced by any booking, so historical transactions are never
-- affected (no booking/invoice currently uses it). This is config data, not
-- transaction data.
DELETE FROM "pricing_methods"
WHERE "key" = 'minimum_charge'
  AND "id" NOT IN (
    SELECT DISTINCT "pricing_method_id" FROM "bookings" WHERE "pricing_method_id" IS NOT NULL
  );
