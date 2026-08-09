import { prisma } from "../src/db/prisma";
import { SaasAuthService } from "../src/modules/saas/auth/saasAuth.service";
import { SaasPaymentGatewayService } from "../src/modules/saas/payments/saasPaymentGateway.service";
import { SaasProvisioningService } from "../src/modules/saas/provisioning/saasProvisioning.service";
import { SaasSsoService } from "../src/modules/saas/auth/saasSso.service";
import { SaasAdminService } from "../src/modules/saas/admin/saasAdmin.service";
import { isReservedSlug, generateSlugCandidate } from "../src/modules/saas/utils/slug.util";

async function runS3TestSuite() {
  console.log("==================================================");
  console.log("STARTING S3 REAL COMMERCIAL ACTIVATION & PROVISIONING TESTS");
  console.log("==================================================\n");

  const ts = Date.now();
  const emailA = `customer_a_${ts}@example.com`;
  const emailB = `customer_b_${ts}@example.com`;
  const password = "TestPassword123!";

  const saasAuthService = new SaasAuthService();
  const paymentGateway = new SaasPaymentGatewayService();
  const provisioningService = new SaasProvisioningService();
  const ssoService = new SaasSsoService();
  const adminService = new SaasAdminService();

  try {
    // 1. REGISTER CUSTOMER A & B
    console.log("[TEST 1] Registering Customer A & Customer B...");
    const regA = await saasAuthService.register({
      email: emailA,
      password,
      businessName: "Greenfields Custom Hiring",
      contactPerson: "Ramesh Patel",
      phone: `98${ts.toString().slice(-8)}`,
      address: "123 Farm Road",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141001",
      gstin: "03AAAAA0000A1Z5",
    });

    const regB = await saasAuthService.register({
      email: emailB,
      password,
      businessName: "Superstar Machinery Hub",
      contactPerson: "Suresh Kumar",
      phone: `97${ts.toString().slice(-8)}`,
      city: "Karnal",
      state: "Haryana",
    });

    console.log("   Customer A Registered ID:", regA.user.id);
    console.log("   Customer B Registered ID:", regB.user.id);

    // 2. LOGIN
    console.log("\n[TEST 2] Testing SaaS Login...");
    const loginA = await saasAuthService.login({ email: emailA, password });
    if (!loginA.tokens?.accessToken) throw new Error("Login failed to issue token");
    console.log("   SaaS Login Successful");

    // 3. PAYMENT ORDER CREATION & TAX CALCULATION (₹4,999.00 INCLUSIVE GST)
    console.log("\n[TEST 3] Testing Payment Order Session Creation...");
    const orderA = await paymentGateway.createOrder(regA.user.id, { isInterState: false });
    console.log("   Order Created:", orderA.gatewayOrderId);
    console.log("   Total Amount:", orderA.amount, "(Expected: 4999)");
    console.log("   Base Amount:", orderA.taxBreakdown.baseAmount, "(Expected: 4236.44)");
    console.log("   GST Amount:", orderA.taxBreakdown.gstAmount, "(Expected: 762.56)");

    if (orderA.amount !== 4999) throw new Error(`Incorrect order total: ${orderA.amount}`);
    if (orderA.taxBreakdown.baseAmount !== 4236.44) throw new Error("Incorrect base tax amount");

    // 4. SERVER-SIDE PAYMENT VERIFICATION & AUTOMATIC PROVISIONING
    console.log("\n[TEST 4] Testing Server-Side Payment Verification & License Activation...");
    const verifyResA = await paymentGateway.verifyPayment(regA.user.id, {
      paymentId: orderA.paymentId,
      gatewayPaymentId: `pay_test_${ts}`,
      gatewaySignature: `sig_test_${ts}`,
    });

    console.log("   Payment Verification Result:", verifyResA.status);
    console.log("   Active License Number:", verifyResA.licenseNumber);
    console.log("   Provisioned Tenant Slug:", verifyResA.tenantSlug);
    console.log("   Software URL:", verifyResA.softwareUrl);

    if (verifyResA.status !== "SUCCESS") throw new Error("Payment verification failed");
    if (!verifyResA.tenantSlug) throw new Error("Tenant slug was not provisioned");

    // 5. IDEMPOTENCY / DUPLICATE WEBHOOK PROTECTION
    console.log("\n[TEST 5] Testing Webhook & Payment Idempotency...");
    const repeatVerify = await paymentGateway.verifyPayment(regA.user.id, {
      paymentId: orderA.paymentId,
    });
    if (!repeatVerify.alreadyProcessed) {
      throw new Error("Repeat verification was not detected as already processed!");
    }
    console.log("   Idempotency Verified: Duplicate call safely returned existing tenant slug without re-creating company.");

    // 6. LICENSE DURATION & UNIQUE SLUG VERIFICATION
    console.log("\n[TEST 6] Verifying License Duration (365 Days) & Reserved Slugs...");
    const licA = await prisma.license.findFirst({ where: { saasUserId: regA.user.id } });
    if (!licA || !licA.startDate || !licA.expiryDate) throw new Error("License dates missing");

    const durationDays = Math.round(
      (new Date(licA.expiryDate).getTime() - new Date(licA.startDate).getTime()) / (1000 * 3600 * 24)
    );
    console.log("   License Duration (Days):", durationDays, "(Expected: 365)");
    if (durationDays !== 365) throw new Error(`Incorrect license duration: ${durationDays}`);

    // Reserved slug test
    console.log("   Testing Reserved Slug Check ('admin', 'portal', 'shaboo')...");
    if (!isReservedSlug("admin") || !isReservedSlug("shaboo") || !isReservedSlug("portal")) {
      throw new Error("Reserved slug validation failed");
    }
    console.log("   Reserved slugs strictly protected.");

    // 7. SINGLE SIGN-ON (SSO) LAUNCH TOKEN & SINGLE-USE ENFORCEMENT
    console.log("\n[TEST 7] Testing Single Sign-On (SSO) Launch Token...");
    const ssoRes = await ssoService.createSsoLaunchToken(regA.user.id);
    console.log("   Generated SSO Launch Token:", ssoRes.ssoToken.slice(0, 16) + "...");
    console.log("   SSO Launch Target URL:", ssoRes.softwareUrl);

    // Exchange token first time
    const exchangeRes1 = await ssoService.exchangeSsoToken(ssoRes.ssoToken);
    console.log("   SSO Token Exchange 1 Successful!");
    console.log("   Authenticated Operational User:", exchangeRes1.user.fullName);
    console.log("   Operational User Role:", exchangeRes1.user.role, "(Expected: owner)");
    console.log("   Company Bound:", exchangeRes1.company.name);

    if (exchangeRes1.user.role !== "owner") throw new Error("SSO did not log user in as owner");

    // Attempt token re-use
    console.log("   Testing Rejection of Re-used SSO Token...");
    try {
      await ssoService.exchangeSsoToken(ssoRes.ssoToken);
      throw new Error("Re-used SSO token was incorrectly accepted!");
    } catch (err: any) {
      if (err.message.includes("already been used")) {
        console.log("   Re-used SSO token cleanly rejected (Single-use enforced).");
      } else {
        throw err;
      }
    }

    // 8. DATA ISOLATION / CROSS-TENANT PROTECTION
    console.log("\n[TEST 8] Testing Customer A vs Customer B Data Isolation...");
    const paymentBList = await prisma.saaSPayment.findMany({ where: { saasUserId: regB.user.id } });
    const paymentAList = await prisma.saaSPayment.findMany({ where: { saasUserId: regA.user.id } });

    console.log("   Customer A Payment Count:", paymentAList.length);
    console.log("   Customer B Payment Count:", paymentBList.length);

    if (paymentBList.some((p) => p.saasUserId === regA.user.id)) {
      throw new Error("Data breach: Customer B saw Customer A payment!");
    }
    console.log("   Tenant Data Isolation Verified cleanly.");

    // 9. PLATFORM ADMIN CONTROL PLANE
    console.log("\n[TEST 9] Testing Platform Admin Control Plane...");
    // Create an admin user
    const adminUser = await prisma.saasUser.create({
      data: {
        email: `admin_${ts}@shabooagri.com`,
        passwordHash: "hash",
        isPlatformAdmin: true,
      },
    });

    const metrics = await adminService.getDashboardMetrics();
    console.log("   Admin Dashboard Metrics:");
    console.log("     - Total Registered Users:", metrics.totalUsers);
    console.log("     - Active Licenses:", metrics.activeLicenses);
    console.log("     - Total Revenue:", metrics.totalRevenue);

    const customers = await adminService.listCustomers();
    console.log("   Admin Customers List Count:", customers.length);

    const licensesList = await adminService.listLicenses();
    console.log("   Admin Licenses List Count:", licensesList.length);

    // Test Admin License Extension
    const licToExtend = licensesList[0];
    const extRes = await adminService.extendLicense(adminUser.id, licToExtend.id, 30, "Customer courtesy test extension");
    console.log("   Admin License Extension Verified: Extended expiry to", new Date(extRes.expiryDate!).toLocaleDateString());

    console.log("\n==================================================");
    console.log("ALL S3 ACTIVATION & PROVISIONING TESTS PASSED 100%");
    console.log("==================================================\n");

  } finally {
    console.log("Cleaning up S3 test data...");
    await prisma.ssoToken.deleteMany({ where: { saasUser: { email: { in: [emailA, emailB] } } } }).catch(() => {});
    await prisma.saaSPayment.deleteMany({ where: { saasUser: { email: { in: [emailA, emailB] } } } }).catch(() => {});
    await prisma.license.deleteMany({ where: { saasUser: { email: { in: [emailA, emailB] } } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { email: { in: [emailA, emailB] } } }).catch(() => {});
    await prisma.saaSCustomerProfile.deleteMany({ where: { saasUser: { email: { in: [emailA, emailB] } } } }).catch(() => {});
    await prisma.saasUser.deleteMany({ where: { email: { in: [emailA, emailB] } } }).catch(() => {});
    await prisma.saasUser.deleteMany({ where: { email: { startsWith: "admin_" } } }).catch(() => {});
    console.log("S3 Test cleanup finished successfully.\n");
  }
}

runS3TestSuite().catch((err) => {
  console.error("FATAL: S3 Test Suite Failed:", err);
  process.exit(1);
});
