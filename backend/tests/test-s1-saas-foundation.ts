import { app } from "../src/app";
import { prisma } from "../src/db/prisma";
import express from "express";
import http from "http";

async function makeRequest(
  serverUrl: string,
  method: string,
  path: string,
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${serverUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.data ?? json, raw: json };
}

async function runS1SaasFoundationTests() {
  console.log("==================================================");
  console.log("STARTING S1 SAAS CONTROL PLANE FOUNDATION TESTS");
  console.log("==================================================");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const serverUrl = `http://localhost:${address.port}`;

  try {
    // -----------------------------------------------------------------
    // TEST 1: SaaS Registration, Auth & Admin Privilege Escalation
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] SaaS User Registration & Authentication...");
    const adminEmail = `saas_admin_${Date.now()}@shabooagri.com`;
    const regRes = await makeRequest(serverUrl, "POST", "/saas/auth/register", {
      email: adminEmail,
      password: "SuperSecretPassword123!",
      businessName: "ShabooAgri Platform Ops",
      contactPerson: "Platform Admin",
      phone: "9876543210",
      state: "Punjab",
      city: "Ludhiana",
    });

    if (regRes.status !== 201 || !regRes.data?.tokens?.accessToken) {
      throw new Error(`Failed to register SaaS User: ${JSON.stringify(regRes.raw)}`);
    }
    const adminUserId = regRes.data.user.id;
    let adminToken = regRes.data.tokens.accessToken;
    console.log(`   SaaS User registered: ${adminUserId}`);

    // Promote user to Platform Admin in DB for testing control plane endpoints
    await prisma.saasUser.update({
      where: { id: adminUserId },
      data: { isPlatformAdmin: true },
    });

    // Re-login to get updated token payload
    const loginRes = await makeRequest(serverUrl, "POST", "/saas/auth/login", {
      email: adminEmail,
      password: "SuperSecretPassword123!",
    });
    if (loginRes.status !== 200 || !loginRes.data?.tokens?.accessToken) {
      throw new Error(`Failed to log in SaaS Platform Admin: ${JSON.stringify(loginRes.raw)}`);
    }
    adminToken = loginRes.data.tokens.accessToken;
    console.log("   SaaS Platform Admin authenticated successfully!");

    // Test /saas/auth/me
    const meRes = await makeRequest(serverUrl, "GET", "/saas/auth/me", undefined, adminToken);
    if (meRes.status !== 200 || meRes.data?.email !== adminEmail || !meRes.data?.isPlatformAdmin) {
      throw new Error(`Failed to fetch /saas/auth/me: ${JSON.stringify(meRes.raw)}`);
    }
    console.log("   SaaS Auth /me endpoint verified with Platform Admin privilege!");

    // -----------------------------------------------------------------
    // TEST 2: SaaS Lead Management Pipeline
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] SaaS Lead Management Pipeline...");
    const leadRes = await makeRequest(serverUrl, "POST", "/saas/leads", {
      name: "Ramesh Farmer Operations",
      businessName: "Ramesh Agrotech Pvt Ltd",
      email: `ramesh_lead_${Date.now()}@example.com`,
      phone: "9876543210",
      source: "WEBSITE",
    });

    if (leadRes.status !== 201 || !leadRes.data?.id) {
      throw new Error(`Failed to create SaaS Lead: ${JSON.stringify(leadRes.raw)}`);
    }
    const leadId = leadRes.data.id;
    console.log(`   SaaS Lead created: ${leadId} (${leadRes.data.businessName})`);

    // Update Lead Status to CONTACTED
    const updateLeadRes = await makeRequest(serverUrl, "PATCH", `/saas/leads/${leadId}`, {
      status: "CONTACTED",
      followUpNotes: "Contacted via phone call for demo",
    }, adminToken);

    if (updateLeadRes.status !== 200 || updateLeadRes.data?.status !== "CONTACTED") {
      throw new Error(`Failed to update lead status: ${JSON.stringify(updateLeadRes.raw)}`);
    }
    console.log("   SaaS Lead status transition (NEW -> CONTACTED) verified!");

    // List Leads
    const listLeadsRes = await makeRequest(serverUrl, "GET", "/saas/leads", undefined, adminToken);
    if (listLeadsRes.status !== 200 || !Array.isArray(listLeadsRes.data)) {
      throw new Error(`Failed to list SaaS leads: ${JSON.stringify(listLeadsRes.raw)}`);
    }
    console.log(`   SaaS Leads listing verified (Count: ${listLeadsRes.data.length})`);

    // -----------------------------------------------------------------
    // TEST 3: SaaS License & Commercial Customer Provisioning
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] SaaS Customer Profile & License Key Issuance...");

    const custEmail = `saas_customer_${Date.now()}@example.com`;
    const custRegRes = await makeRequest(serverUrl, "POST", "/saas/auth/register", {
      email: custEmail,
      password: "CustomerPassword123!",
      businessName: "Suresh Custom Hiring Center",
      contactPerson: "Suresh Owner",
      phone: "9811122233",
      state: "Haryana",
      city: "Karnal",
    });

    if (custRegRes.status !== 201 || !custRegRes.data?.user?.id) {
      throw new Error(`Failed to register SaaS customer: ${JSON.stringify(custRegRes.raw)}`);
    }
    const saasUserId = custRegRes.data.user.id;
    const custToken = custRegRes.data.tokens.accessToken;
    console.log(`   SaaS Customer profile created: ${saasUserId}`);

    // Issue License Key
    const issueLicRes = await makeRequest(serverUrl, "POST", "/saas/licenses/issue", {
      saasUserId,
      status: "LICENSE_ACTIVE",
      notes: "Annual PRO License Issued by Super Admin",
    }, adminToken);

    if (issueLicRes.status !== 201 || !issueLicRes.data?.licenseNumber) {
      throw new Error(`Failed to issue license key: ${JSON.stringify(issueLicRes.raw)}`);
    }
    const licenseNumber = issueLicRes.data.licenseNumber;
    const licenseId = issueLicRes.data.id;
    console.log(`   SaaS License Key issued: ${licenseNumber} (Status: ${issueLicRes.data.status})`);

    // Fetch Customer License Endpoint
    const myLicRes = await makeRequest(serverUrl, "GET", "/saas/licenses/my-license", undefined, custToken);
    if (myLicRes.status !== 200 || !Array.isArray(myLicRes.data) || myLicRes.data.length === 0) {
      throw new Error(`Failed to fetch my license: ${JSON.stringify(myLicRes.raw)}`);
    }
    console.log(`   SaaS License Key customer fetch endpoint verified (License count: ${myLicRes.data.length})!`);

    // -----------------------------------------------------------------
    // TEST 4: Commercial SaaS Payment Record & Tax Calculation
    // -----------------------------------------------------------------
    console.log("\n[TEST 4] Commercial SaaS Payment & Tax Calculation...");
    const payRes = await makeRequest(serverUrl, "POST", "/saas/payments/record", {
      saasUserId,
      licenseId,
      isInterState: false,
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "TXN-BANK-998877",
      status: "SUCCESS",
      notes: "Payment received for 1-year PRO license subscription",
    }, adminToken);

    if (payRes.status !== 201) {
      throw new Error(`Failed to record SaaS payment. Status: ${payRes.status}, Raw: ${JSON.stringify(payRes.raw)}`);
    }
    const payment = payRes.data.payment;
    if (!payment?.id) {
      throw new Error(`Payment object missing ID. Data: ${JSON.stringify(payRes.data)}`);
    }
    console.log(`   SaaS Payment recorded: ${payment.id} (Base: ₹${payment.baseAmount}, GST: ₹${payment.gstAmount}, Total: ₹${payment.totalAmount})`);
    if (Number(payment.gstAmount) <= 0) {
      throw new Error("Tax calculation failed for SaaS Payment");
    }
    console.log("   SaaS Commercial Tax & IGST/CGST/SGST calculation verified!");

    // -----------------------------------------------------------------
    // TEST 5: SaaS Enquiries & Customer Feedback
    // -----------------------------------------------------------------
    console.log("\n[TEST 5] SaaS Contact Enquiries & Feedback...");
    const enqRes = await makeRequest(serverUrl, "POST", "/saas/enquiries", {
      name: "Anita Sharma",
      email: "anita@example.com",
      phone: "9988776655",
      subject: "Custom Enterprise Plan Enquiry",
      message: "Looking for 50+ machine tracking & driver management custom enterprise quote.",
    });

    if (enqRes.status !== 201 || !enqRes.data?.id) {
      throw new Error(`Failed to submit SaaS enquiry: ${JSON.stringify(enqRes.raw)}`);
    }
    console.log("   SaaS Public Contact Enquiry submitted successfully!");

    const fbRes = await makeRequest(serverUrl, "POST", "/saas/feedback", {
      category: "FEATURE_REQUEST",
      comment: "Would love automated WhatsApp PDF invoices for farmers.",
      rating: 5,
    }, custToken);

    if (fbRes.status !== 201 || !fbRes.data?.id) {
      throw new Error(`Failed to submit SaaS feedback: ${JSON.stringify(fbRes.raw)}`);
    }
    console.log("   SaaS Customer Feedback submitted successfully!");

    // -----------------------------------------------------------------
    // TEST 6: SaaS Admin Control Plane Dashboard Metrics Analytics
    // -----------------------------------------------------------------
    console.log("\n[TEST 6] SaaS Admin Control Plane Dashboard Metrics Analytics...");
    const overviewRes = await makeRequest(serverUrl, "GET", "/saas/admin/dashboard", undefined, adminToken);
    if (overviewRes.status !== 200 || typeof overviewRes.data?.totalRevenueAmount !== "number") {
      throw new Error(`Failed to fetch SaaS admin dashboard: ${JSON.stringify(overviewRes.raw)}`);
    }
    console.log("   SaaS Admin Dashboard metrics analytics verified:");
    console.log(`     - Total Revenue: ₹${overviewRes.data.totalRevenueAmount}`);
    console.log(`     - Active Licenses: ${overviewRes.data.activeLicenses}`);
    console.log(`     - Total Leads: ${overviewRes.data.totalLeads}`);
    console.log(`     - Total Customers: ${overviewRes.data.totalCustomers}`);
    console.log(`     - Unread Enquiries: ${overviewRes.data.unreadEnquiries}`);

    // Clean up test SaaS entities
    await prisma.saaSPayment.deleteMany({ where: { id: payment.id } });
    await prisma.license.deleteMany({ where: { saasUserId: { in: [saasUserId, adminUserId] } } });
    await prisma.customerFeedback.deleteMany({ where: { id: fbRes.data.id } });
    await prisma.contactEnquiry.deleteMany({ where: { id: enqRes.data.id } });
    await prisma.saaSLead.deleteMany({ where: { id: leadId } });
    await prisma.saaSCustomerProfile.deleteMany({ where: { saasUserId: { in: [saasUserId, adminUserId] } } });
    await prisma.saasUser.deleteMany({ where: { id: { in: [saasUserId, adminUserId] } } });

    console.log("\n==================================================");
    console.log("ALL S1 SAAS CONTROL PLANE FOUNDATION TESTS PASSED!");
    console.log("==================================================");
  } finally {
    server.close();
  }
}

runS1SaasFoundationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
