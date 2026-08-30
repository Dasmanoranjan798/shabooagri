import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as authService from "../src/modules/auth/auth.service";

// End-to-end coverage for the PIN authentication lifecycle:
//   create PIN (post-OTP) -> PIN login -> reset PIN -> anti-enumeration
//   -> cross-company isolation -> secret non-exposure -> regressions.
// Runs in-process against the real service/repository (same pattern as
// test-password-reset.ts), writing synthetic users it deletes in `finally`.
async function runPinAuthTestSuite() {
  console.log("==================================================");
  console.log("STARTING PIN AUTHENTICATION LIFECYCLE TEST SUITE");
  console.log("==================================================");

  const companyA = await prisma.company.findFirstOrThrow({ where: { slug: "pilot" } });
  const companyB = await prisma.company.findFirstOrThrow({ where: { slug: "demo" } });
  const suffix = Date.now().toString();
  const emailA = `pin_a_${suffix}@example.com`;
  const emailB = `pin_b_${suffix}@example.com`;
  const password = "InitialPassword123!";
  const pin = "4321";
  const newPin = "778899";
  const nonExistent = `pin_none_${suffix}@example.com`;

  let userA: Awaited<ReturnType<typeof authRepository.createUser>> | null = null;
  let userB: Awaited<ReturnType<typeof authRepository.createUser>> | null = null;

  const assert = (cond: any, msg: string) => {
    if (!cond) throw new Error(msg);
  };

  try {
    const roleA = await authRepository.findRoleByKey(companyA.id, "owner");
    const roleB = await authRepository.findRoleByKey(companyB.id, "owner");
    if (!roleA || !roleB) throw new Error("Owner role not found in a test company");

    // User A: password only, NO pin yet (first-time Create-PIN candidate).
    userA = await authRepository.createUser({
      company: { connect: { id: companyA.id } },
      role: { connect: { id: roleA.id } },
      fullName: `PIN Test A ${suffix}`,
      email: emailA,
      passwordHash: await bcrypt.hash(password, 10),
    });
    // User B lives in a DIFFERENT company and will share the SAME pin value.
    userB = await authRepository.createUser({
      company: { connect: { id: companyB.id } },
      role: { connect: { id: roleB.id } },
      fullName: `PIN Test B ${suffix}`,
      email: emailB,
    });

    // ---------------------------------------------------------------
    console.log("\n[A] First-time PIN setup (Create PIN)...");
    const beforeUser = await authRepository.findUserById(userA.id);
    assert(beforeUser && beforeUser.pinHash == null, "User A should start with no PIN");
    // The service call is what Create-PIN runs once the OTP login has produced
    // an authenticated session (here we call it directly with the user id).
    const setRes: any = await authService.setPin(userA.id, { pin });
    assert(setRes.message && /saved/i.test(setRes.message), "setPin should confirm success");
    assert(setRes.user && setRes.user.hasPin === true, "returned user must report hasPin=true");
    assert(!("pinHash" in setRes.user), "returned user must NOT contain pinHash");
    assert(!("passwordHash" in setRes.user), "returned user must NOT contain passwordHash");
    assert(JSON.stringify(setRes).indexOf(pin) === -1, "raw PIN must never appear in the response");
    const afterUser = await authRepository.findUserById(userA.id);
    assert(afterUser!.pinHash && afterUser!.pinHash !== pin, "PIN must be stored hashed, never plaintext");
    console.log(" PIN created, hashed, hasPin=true, raw PIN not returned");

    // ---------------------------------------------------------------
    console.log("\n[B] PIN login...");
    const okLogin = await authService.loginWithPin({ identifier: emailA, pin }, companyA);
    assert(okLogin && okLogin.accessToken, "Correct PIN should log in");
    assert((okLogin.user as any).hasPin === true, "login user should report hasPin=true");
    assert(!("pinHash" in (okLogin.user as any)), "login response must not leak pinHash");
    console.log(" Correct PIN logs in; response carries no PIN hash");

    console.log("\n[B2] Incorrect PIN is rejected...");
    try {
      await authService.loginWithPin({ identifier: emailA, pin: "0000" }, companyA);
      throw new Error("Incorrect PIN was accepted!");
    } catch (err: any) {
      assert(err.statusCode === 401, `Expected 401, got ${err.statusCode}`);
      console.log(" Incorrect PIN rejected with 401");
    }

    // ---------------------------------------------------------------
    console.log("\n[C] Forgot PIN / reset replaces the old PIN...");
    await authService.setPin(userA.id, { pin: newPin });
    const newOk = await authService.loginWithPin({ identifier: emailA, pin: newPin }, companyA);
    assert(newOk && newOk.accessToken, "New PIN should log in after reset");
    try {
      await authService.loginWithPin({ identifier: emailA, pin }, companyA);
      throw new Error("Old PIN still worked after reset!");
    } catch (err: any) {
      assert(err.statusCode === 401, `Expected old PIN to be 401, got ${err.statusCode}`);
      console.log(" New PIN works; old PIN no longer authenticates");
    }

    // ---------------------------------------------------------------
    console.log("\n[D] Cross-company isolation...");
    // Give user B (different company) the SAME pin value as user A originally had.
    await authService.setPin(userB.id, { pin });
    // A user A PIN must not authenticate inside company B, and vice-versa.
    try {
      await authService.loginWithPin({ identifier: emailA, pin: newPin }, companyB);
      throw new Error("User A authenticated against company B!");
    } catch (err: any) {
      assert(err.statusCode === 401, "Cross-company PIN login must fail");
    }
    // User B's PIN works only within company B.
    const bOk = await authService.loginWithPin({ identifier: emailB, pin }, companyB);
    assert(bOk && bOk.accessToken, "User B PIN should work within company B");
    try {
      await authService.loginWithPin({ identifier: emailB, pin }, companyA);
      throw new Error("User B authenticated against company A with a shared PIN!");
    } catch (err: any) {
      assert(err.statusCode === 401, "Shared PIN must not cross tenants");
    }
    console.log(" A PIN authenticates only within its own company/tenant");

    // ---------------------------------------------------------------
    console.log("\n[E] setPin requires an existing user (no silent create)...");
    try {
      await authService.setPin("00000000-0000-0000-0000-000000000000", { pin });
      throw new Error("setPin succeeded for a non-existent user!");
    } catch (err: any) {
      assert(err.statusCode === 404, `Expected 404, got ${err.statusCode}`);
      console.log(" setPin on an unknown user id is rejected with 404");
    }

    // ---------------------------------------------------------------
    console.log("\n[F] OTP request is non-enumerating...");
    const noneRes = await authService.requestOtp({ identifier: nonExistent }, companyA);
    assert(noneRes.message && /if an account exists/i.test(noneRes.message),
      "Unknown identifier must get the generic anti-enumeration message");
    const leaked = await authRepository.findActiveOtp(nonExistent, "LOGIN");
    assert(!leaked, "No OTP code should be created for a non-existent account");
    console.log(" Unknown identifier gets a generic response and no OTP is issued");

    // ---------------------------------------------------------------
    console.log("\n[G] Regression: password + OTP login still work...");
    const pwOk = await authService.loginWithPassword({ identifier: emailA, password }, companyA);
    assert(pwOk && pwOk.accessToken, "Password login regressed!");
    // OTP login: seed a code directly (avoids sending a real message in prod),
    // then verify+login through the authoritative path.
    const otpCode = "123456";
    await authRepository.createOtpCode({
      identifier: emailA,
      codeHash: await bcrypt.hash(otpCode, 10),
      purpose: "LOGIN",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const otpOk = await authService.verifyOtpAndLogin({ identifier: emailA, code: otpCode }, companyA);
    assert(otpOk && otpOk.accessToken, "OTP login regressed!");
    console.log(" Password login and OTP login remain functional");

    console.log("\n==================================================");
    console.log(" ALL PIN AUTHENTICATION LIFECYCLE TESTS PASSED!");
    console.log("==================================================");
  } finally {
    console.log("Cleaning up synthetic test data...");
    await prisma.otpCode.deleteMany({ where: { identifier: { in: [emailA, emailB, nonExistent] } } });
    for (const u of [userA, userB]) {
      if (u) {
        await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
        await prisma.user.deleteMany({ where: { id: u.id } });
      }
    }
    console.log("Cleanup complete.");
  }
}

runPinAuthTestSuite()
  .catch((err) => {
    console.error("PIN Auth Test Suite Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
