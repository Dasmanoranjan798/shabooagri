/**
 * set-owner-account.mjs
 * Safely replaces the pilot tenant Owner account for Manoranjan Das.
 *
 * Usage (Owner enters password via silent read — never echoed):
 *   read -rsp "Enter new Owner password: " P && echo && OWNER_NEW_PASSWORD="$P" node scripts/set-owner-account.mjs && unset P
 *
 * SECURITY RULES (enforced in this script):
 * - The plaintext password is NEVER logged, printed, written to files, or stored anywhere except as a bcrypt hash.
 * - No secret is written to the console output.
 * - The script deletes the temp env variable from memory after hashing.
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

// Load dotenv
const dotenvPath = path.resolve(process.cwd(), ".env");
const dotenv = require("dotenv");
dotenv.config({ path: dotenvPath });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Target constants
const PILOT_COMPANY_ID    = "29c82d91-d80e-4358-a180-dd5df8cae889";
const PRIMARY_OWNER_ID    = "72a391c8-c511-46ee-a879-5e6e3a61b77e"; // Pradeep Swain — to be updated
const TARGET_NAME         = "Manoranjan Das";
const TARGET_EMAIL        = "Dasmanoranjan798@gmail.com";
const TARGET_MOBILE       = "9145751663";

// All other spurious test owner IDs to deactivate
const SPURIOUS_OWNER_IDS  = [
  "18ce6092-441a-4cde-8970-c358a3353eb0", // Test Owner
  "37f9f0b0-e014-45c2-b044-510d8660a6f8", // Test Reset Owner (1)
  "75a3cc39-f85f-4ce0-b9a1-bd08ec29fb5b", // Test Reset Owner (2)
  "b6fe1aab-9658-48dc-a559-906a39a56cf7", // Test Reset Owner (3)
  "5ddc850e-1c7e-4d79-b983-ba56e51c27ed", // Test Reset Owner (4)
];

async function main() {
  // Read password from environment only — never from args, never from files
  const plainPassword = process.env.OWNER_NEW_PASSWORD;
  if (!plainPassword || plainPassword.trim() === "") {
    console.error("ERROR: OWNER_NEW_PASSWORD environment variable is not set or empty.");
    console.error("Run: read -rsp \"Enter new Owner password: \" P && echo && OWNER_NEW_PASSWORD=\"$P\" node scripts/set-owner-account.mjs && unset P");
    process.exit(1);
  }
  if (plainPassword.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }

  // Hash the password with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  // Immediately clear the variable reference — no further use of plaintext
  process.env.OWNER_NEW_PASSWORD = "";

  console.log("=== ShabooAgri Pilot Owner Account Update ===");
  console.log("Pilot Company ID:", PILOT_COMPANY_ID);
  console.log("Target Owner:    ", TARGET_NAME);
  console.log("Target Email:    ", TARGET_EMAIL);
  console.log("Target Mobile:   ", TARGET_MOBILE);
  console.log("Password:         [SET — NOT DISPLAYED]");
  console.log("");

  // Step 1: Verify the primary owner record exists
  const existing = await prisma.user.findUnique({
    where: { id: PRIMARY_OWNER_ID },
    select: { id: true, fullName: true, email: true, mobileNumber: true, status: true, companyId: true }
  });
  if (!existing) {
    console.error("ERROR: Primary Owner record not found. ID:", PRIMARY_OWNER_ID);
    process.exit(1);
  }
  console.log("[PRE-CHECK] Current Owner record:");
  console.log("  ID:     ", existing.id);
  console.log("  Name:   ", existing.fullName);
  console.log("  Email:  ", existing.email);
  console.log("  Mobile: ", existing.mobileNumber || "(none)");
  console.log("  Status: ", existing.status);

  if (existing.companyId !== PILOT_COMPANY_ID) {
    console.error("ERROR: Owner record does not belong to pilot company. Aborting.");
    process.exit(1);
  }

  // Step 2: Check for unique constraint conflicts on target email/mobile
  const emailConflict = await prisma.user.findFirst({
    where: {
      companyId: PILOT_COMPANY_ID,
      email: TARGET_EMAIL,
      id: { not: PRIMARY_OWNER_ID }
    },
    select: { id: true, fullName: true }
  });
  if (emailConflict) {
    console.error(`ERROR: Email ${TARGET_EMAIL} is already used by another user: ${emailConflict.fullName} (${emailConflict.id})`);
    process.exit(1);
  }

  const mobileConflict = await prisma.user.findFirst({
    where: {
      companyId: PILOT_COMPANY_ID,
      mobileNumber: TARGET_MOBILE,
      id: { not: PRIMARY_OWNER_ID }
    },
    select: { id: true, fullName: true }
  });
  if (mobileConflict) {
    console.error(`ERROR: Mobile ${TARGET_MOBILE} is already used by another user: ${mobileConflict.fullName} (${mobileConflict.id})`);
    process.exit(1);
  }

  // Step 3: Atomically update Owner + deactivate spurious accounts
  await prisma.$transaction(async (tx) => {
    // 3a. Update the primary owner account
    const updated = await tx.user.update({
      where: { id: PRIMARY_OWNER_ID },
      data: {
        fullName:     TARGET_NAME,
        email:        TARGET_EMAIL,
        mobileNumber: TARGET_MOBILE,
        passwordHash: passwordHash,
        pinHash:      null,          // Clear any old PIN — Owner can set a new one
        status:       "ACTIVE",
      },
      select: { id: true, fullName: true, email: true, mobileNumber: true, status: true }
    });
    console.log("\n[UPDATE] Primary Owner account updated:");
    console.log("  ID:     ", updated.id);
    console.log("  Name:   ", updated.fullName);
    console.log("  Email:  ", updated.email);
    console.log("  Mobile: ", updated.mobileNumber);
    console.log("  Status: ", updated.status);
    console.log("  PIN:     cleared (will be set by Owner on first login)");

    // 3b. Revoke all refresh tokens for the primary owner
    const revokedTokens = await tx.refreshToken.deleteMany({ where: { userId: PRIMARY_OWNER_ID } });
    console.log(`\n[SECURITY] Revoked ${revokedTokens.count} existing refresh token(s) for primary owner.`);

    // 3c. Revoke OTP/Reset tokens for primary owner
    const revokedOtps = await tx.otpCode.deleteMany({ where: { identifier: existing.email } });
    console.log(`[SECURITY] Cleared ${revokedOtps.count} outstanding OTP/reset token(s) for old email.`);

    // 3d. Deactivate all spurious test Owner accounts
    for (const spuriousId of SPURIOUS_OWNER_IDS) {
      const deactivated = await tx.user.update({
        where: { id: spuriousId },
        data: { status: "INACTIVE" },
        select: { id: true, fullName: true, status: true }
      });
      // Revoke their tokens too
      await tx.refreshToken.deleteMany({ where: { userId: spuriousId } });
      console.log(`[DEACTIVATE] ${deactivated.fullName} (${deactivated.id}) → ${deactivated.status}`);
    }
  });

  // Step 4: Verify final state — exactly ONE active Owner
  const allOwners = await prisma.user.findMany({
    where: {
      companyId: PILOT_COMPANY_ID,
      role: { systemKey: "owner" }
    },
    select: { id: true, fullName: true, email: true, mobileNumber: true, status: true }
  });

  const activeOwners = allOwners.filter(u => u.status === "ACTIVE");
  const inactiveOwners = allOwners.filter(u => u.status !== "ACTIVE");

  console.log("\n=== FINAL STATE VERIFICATION ===");
  console.log(`Total Owner-role accounts: ${allOwners.length}`);
  console.log(`Active Owners: ${activeOwners.length}`);
  console.log(`Inactive Owners: ${inactiveOwners.length}`);

  if (activeOwners.length !== 1) {
    console.error(`\nERROR: Expected exactly 1 active Owner, found ${activeOwners.length}. Manual inspection required.`);
    process.exit(1);
  }

  const owner = activeOwners[0];
  console.log("\n✔ Single active Owner confirmed:");
  console.log(`  ID:      ${owner.id}`);
  console.log(`  Name:    ${owner.fullName}`);
  console.log(`  Email:   ${owner.email}`);
  console.log(`  Mobile:  ${owner.mobileNumber}`);
  console.log(`  Status:  ${owner.status}`);

  const nameOk   = owner.fullName    === TARGET_NAME;
  const emailOk  = owner.email       === TARGET_EMAIL;
  const mobileOk = owner.mobileNumber === TARGET_MOBILE;

  console.log(`\n  Name match:   ${nameOk   ? "✔" : "✘"}`);
  console.log(`  Email match:  ${emailOk  ? "✔" : "✘"}`);
  console.log(`  Mobile match: ${mobileOk ? "✔" : "✘"}`);

  if (!nameOk || !emailOk || !mobileOk) {
    console.error("\nERROR: Owner data mismatch after update. Manual inspection required.");
    process.exit(1);
  }

  console.log("\n✔ Owner account successfully configured for Manoranjan Das.");
  console.log("✔ All spurious test Owner accounts deactivated.");
  console.log("✔ All old refresh tokens revoked.");
  console.log("\nNEXT: Verify login via curl or browser before running regression tests.");
}

main()
  .catch(e => { console.error("FATAL:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
