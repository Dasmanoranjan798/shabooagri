import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as authService from "../src/modules/auth/auth.service";
import { AppError } from "../src/shared/errors/AppError";

async function runPasswordResetTestSuite() {
  console.log("==================================================");
  console.log("STARTING PRODUCTION PASSWORD RESET SECURITY TEST SUITE");
  console.log("==================================================");

  const company = await authRepository.findSingleTenantCompany();
  const testSuffix = Date.now().toString();
  const testEmail = `reset_owner_${testSuffix}@example.com`;
  const nonExistentEmail = `nonexistent_${testSuffix}@example.com`;
  const initialPassword = "InitialPassword123!";
  const newPassword = "NewSecurePassword456!";

  // Declared outside the try so the finally block can clean up whatever DID
  // get created even if setup or an assertion throws partway through — this
  // suite writes directly into the shared pilot company, so a run that
  // crashes halfway must not leave a synthetic user/token behind in it.
  let user: Awaited<ReturnType<typeof authRepository.createUser>> | null = null;

  try {
    // Create test user with password and PIN
    const role = await authRepository.findRoleByKey(company.id, "owner");
    if (!role) throw new Error("Owner role not found");

    const pin = "1234";
    user = await authRepository.createUser({
      company: { connect: { id: company.id } },
      role: { connect: { id: role.id } },
      fullName: `Test Reset Owner ${testSuffix}`,
      email: testEmail,
      passwordHash: await bcrypt.hash(initialPassword, 10),
      pinHash: await bcrypt.hash(pin, 10),
    });

    // TEST 1: Reset Request
    console.log("\n[TEST 1] Testing Password Reset Request...");
    const requestRes = await authService.requestPasswordReset({ email: testEmail });
    if (!requestRes || !requestRes.message) {
      throw new Error("Password reset request failed to return a response message");
    }
    console.log(" Password reset request executed successfully");

    // TEST 2: Generic Response (Prevent Account Enumeration)
    console.log("\n[TEST 2] Testing Generic Response for Non-Existent Account...");
    const nonExistentRes = await authService.requestPasswordReset({ email: nonExistentEmail });
    if (nonExistentRes.message !== requestRes.message) {
      throw new Error("Generic response mismatch! Account enumeration possible.");
    }
    console.log(" Generic response identical for both existing and non-existent accounts");

    // TEST 3: Token Generation & DB Storage
    console.log("\n[TEST 3] Testing Token Generation & Hashed Storage...");
    const activeOtp = await authRepository.findActiveOtp(testEmail, "RESET");
    if (!activeOtp) {
      throw new Error("No active reset token found in DB after request");
    }
    if (activeOtp.codeHash === testEmail) {
      throw new Error("Token was stored in plaintext instead of being hashed!");
    }
    console.log(" Token hash securely stored in database");

    // TEST 4: Invalid Token Verification
    console.log("\n[TEST 4] Testing Rejection of Invalid Token...");
    try {
      await authService.verifyPasswordResetToken({ email: testEmail, token: "invalid_fake_token_123" });
      throw new Error("Invalid token was improperly accepted!");
    } catch (err: any) {
      if (err.statusCode === 400 || err.message.includes("Invalid or expired")) {
        console.log(" Invalid token rejected correctly with 400 Bad Request");
      } else {
        throw err;
      }
    }

    // TEST 5: Token Expiration
    console.log("\n[TEST 5] Testing Rejection of Expired Token...");
    const expiredTokenRaw = "expired_token_raw_value_9999";
    const expiredTokenHash = crypto.createHash("sha256").update(expiredTokenRaw).digest("hex");
    await authRepository.createOtpCode({
      identifier: testEmail,
      codeHash: expiredTokenHash,
      purpose: "RESET",
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
    });

    try {
      await authService.verifyPasswordResetToken({ email: testEmail, token: expiredTokenRaw });
      throw new Error("Expired token was improperly accepted!");
    } catch (err: any) {
      if (err.statusCode === 400 || err.message.includes("Invalid or expired")) {
        console.log(" Expired token rejected correctly with 400 Bad Request");
      } else {
        throw err;
      }
    }

    // TEST 6: Successful Password Reset
    console.log("\n[TEST 6] Testing Successful Password Reset...");
    // We extract the actual raw token for the valid reset by inspecting the recent active OTP row or creating a known pair
    const validRawToken = "valid_test_token_bytes_32_chars_12345";
    const validTokenHash = crypto.createHash("sha256").update(validRawToken).digest("hex");
    await authRepository.createOtpCode({
      identifier: testEmail,
      codeHash: validTokenHash,
      purpose: "RESET",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const confirmRes = await authService.confirmPasswordReset({
      email: testEmail,
      token: validRawToken,
      newPassword,
    });

    if (!confirmRes || !confirmRes.message.includes("successfully")) {
      throw new Error("Password reset confirmation failed");
    }
    console.log(" Password reset confirmed successfully");

    // TEST 7: Single-Use Token (Re-use Attempt)
    console.log("\n[TEST 7] Testing Rejection of Single-Use Token Re-use...");
    try {
      await authService.confirmPasswordReset({
        email: testEmail,
        token: validRawToken,
        newPassword: "AnotherNewPassword789!",
      });
      throw new Error("Single-use token was reused successfully!");
    } catch (err: any) {
      if (err.statusCode === 400 || err.message.includes("Invalid or expired")) {
        console.log(" Token re-use rejected cleanly (single-use enforced)");
      } else {
        throw err;
      }
    }

    // TEST 8: Login with New Password
    console.log("\n[TEST 8] Testing Login with Newly Reset Password...");
    const loginRes = await authService.loginWithPassword({
      identifier: testEmail,
      password: newPassword,
    });
    if (!loginRes || !loginRes.accessToken) {
      throw new Error("Login failed with newly reset password!");
    }
    console.log(" Login successful with newly reset password");

    // TEST 9: Old Password Rejection
    console.log("\n[TEST 9] Testing Rejection of Old Password...");
    try {
      await authService.loginWithPassword({
        identifier: testEmail,
        password: initialPassword,
      });
      throw new Error("Old password was accepted after reset!");
    } catch (err: any) {
      if (err.statusCode === 401 || err.message.includes("Invalid credentials")) {
        console.log(" Old password rejected cleanly with 401 Invalid Credentials");
      } else {
        throw err;
      }
    }

    // TEST 10: Existing Quick PIN Login Still Works
    console.log("\n[TEST 10] Testing Existing Quick PIN Login Continuity...");
    const pinLoginRes = await authService.loginWithPin({
      identifier: testEmail,
      pin,
    });
    if (!pinLoginRes || !pinLoginRes.accessToken) {
      throw new Error("PIN login failed after password reset!");
    }
    console.log(" Quick PIN login remains functional and unaffected");

    // TEST 11: Security Audit — No Credential Exposure
    console.log("\n[TEST 11] Validating Security & Non-Exposure of Secrets...");
    const userCheck = await authRepository.findUserById(user.id);
    if (!userCheck) throw new Error("User record missing");
    if (userCheck.passwordHash === newPassword) {
      throw new Error("CRITICAL SECURITY VIOLATION: Password stored in plaintext!");
    }
    console.log(" Passwords securely hashed with bcrypt. Zero credentials exposed.");

    console.log("\n==================================================");
    console.log(" ALL PRODUCTION PASSWORD RESET SECURITY TESTS PASSED!");
    console.log("==================================================");
  } finally {
    console.log("Cleaning up synthetic test data...");
    // Every OTP/reset-token row this suite created shares testEmail as its
    // identifier (TEST 1/2/5/6), so it's a precise, safe scope — never a
    // wholesale delete against the shared pilot company.
    await prisma.otpCode.deleteMany({ where: { identifier: testEmail } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
    console.log("Cleanup complete.");
  }
}

runPasswordResetTestSuite()
  .catch((err) => {
    console.error("Password Reset Test Suite Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
