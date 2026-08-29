import { prisma } from "../../db/prisma";

// §P2-7 — license expiry enforcement.
//
// Licenses are created/renewed as ACTIVE with an `expiryDate` (payments module),
// but nothing ever transitioned them to EXPIRED, so an ACTIVE license whose
// expiry had passed stayed ACTIVE forever and the provisioning/relaunch gates
// (status in [ACTIVE, EXPIRING_SOON]) kept passing. This sweep is the missing
// state transition: it flips any non-expired license whose expiry is in the
// past to EXPIRED, which makes the EXISTING gates enforce expiry — no parallel
// enforcement system is introduced.
//
// Properties:
// - Idempotent: EXPIRED rows are excluded by the WHERE clause, so re-running
//   never rewrites an already-expired license (and updatedAt isn't churned).
// - Renewal-safe: a renewed/extended license has its `expiryDate` moved into
//   the future on the same row, so it is evaluated by its CURRENT expiry and
//   is not matched.
// - Tenant-isolated: the update is keyed purely on each row's own status/expiry;
//   one license/company can never affect another's state.
// - Non-destructive: only the `status` column changes. No payment, invoice, or
//   other historical/transaction data is touched.
// - Trials/cancellations: the LicenseStatus enum has only ACTIVE / EXPIRING_SOON
//   / EXPIRED, so there are no trial/cancelled states to mis-handle.
export async function sweepExpiredLicenses(now: Date = new Date()): Promise<number> {
  const result = await prisma.license.updateMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
      expiryDate: { not: null, lt: now },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
