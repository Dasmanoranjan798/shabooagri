import { prisma } from "../src/db/prisma";
import * as authService from "../src/modules/auth/auth.service";
import * as invoiceRepository from "../src/modules/payments/invoice.repository";
import * as paymentService from "../src/modules/payments/payment.service";
import { seedCompanyRoles } from "./helpers/seedRoles";

import bcrypt from "bcryptjs";

async function runTests() {
  console.log("Starting Payments & Invoices module end-to-end tests...\n");

  const testSuffix = Date.now().toString();

  const company = await prisma.company.create({
    data: {
      name: `Payment Test Company ${testSuffix}`,
      slug: `paytest-${testSuffix}`,
    },
  });
  const companyId = company.id;

  await prisma.pricingMethod.createMany({
    data: [
      { companyId, key: "per_hour", label: "Per Hour", unit: "hour", isActive: true },
      { companyId, key: "per_minute", label: "Per Minute", unit: "minute", isActive: true },
      { companyId, key: "per_acre", label: "Per Acre", unit: "acre", isActive: true },
      { companyId, key: "per_job", label: "Per Job / Fixed", unit: "job", isActive: true },
    ],
  });

  const roleIdByKey = await seedCompanyRoles(companyId);
  const ownerUser = await prisma.user.create({
    data: {
      companyId,
      roleId: roleIdByKey.owner,
      fullName: "Test Owner",
      email: `owner_${testSuffix}@example.com`,
      passwordHash: await bcrypt.hash("Password123!", 10),
    },
  });
  const ownerAuth = { id: ownerUser.id, companyId, roleId: ownerUser.roleId, isOwner: true };

  const managerUser = await authService.register(
    {
      fullName: "Test Manager",
      email: `manager_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "manager",
    },
    ownerAuth,
  );

  const farmerUser = await authService.register(
    {
      fullName: "Test Farmer User",
      email: `farmer_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "farmer",
    },
    ownerAuth,
  );

  const driverUser = await authService.register(
    {
      fullName: "Test Driver User",
      email: `driver_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "driver",
    },
    ownerAuth,
  );

  // 2. Setup Master Data — Village master was retired; `village` is now a
  // plain text attribute on the customer.
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: `Farmer_${testSuffix}`,
      village: `Village_${testSuffix}`,
      userId: farmerUser.user.id,
      phone: "9876543210",
    },
  });

  const otherCustomer = await prisma.customer.create({
    data: {
      companyId,
      name: `OtherFarmer_${testSuffix}`,
      village: `Village_${testSuffix}`,
      phone: "9123456789",
    },
  });

  const machineType = await prisma.machineType.create({
    data: { companyId, name: `Tractor_${testSuffix}` },
  });

  const employee = await prisma.employee.create({
    data: { companyId, name: `Driver_Emp_${testSuffix}` },
  });

  const driver = await prisma.driver.create({
    data: { companyId, employeeId: employee.id },
  });

  const machine = await prisma.machine.create({
    data: {
      companyId,
      machineTypeId: machineType.id,
      registrationNumber: `REG-${testSuffix}`,
      assignedDriverId: driver.id,
    },
  });

  const perHourMethod = await prisma.pricingMethod.findFirst({
    where: { companyId, key: "per_hour" },
  });
  if (!perHourMethod) throw new Error("per_hour pricing method missing");

  const managerAuth = { id: managerUser.user.id, companyId, roleId: managerUser.user.roleId };

  // Helper: create a plain manual-style invoice for a customer at a given
  // amount, so the overpayment case matrix can be set up cleanly without
  // going through the job pipeline.
  async function makeInvoice(forCustomerId: string, amount: number, label: string) {
    const booking = await prisma.booking.create({
      data: {
        companyId,
        bookingNumber: `BK-${label}-${testSuffix}`,
        customerId: forCustomerId,
        managerId: managerUser.user.id,
        scheduledDate: new Date(),
        pricingMethodId: perHourMethod!.id,
        rate: 100,
        createdBy: ownerAuth.id,
      },
    });
    return invoiceRepository.create(companyId, {
      bookingId: booking.id,
      customerId: forCustomerId,
      totalAmount: amount,
      paidAmount: 0,
      balanceAmount: amount,
    });
  }

  console.log(" User & Master Data setup complete");

  // ----------------------------------------------------
  // TEST 1: Monotonic Counter & Delete-Adjacent Scenarios + Concurrency
  // ----------------------------------------------------
  console.log("\n[TEST 1] Monotonic Invoice Counter & Concurrency");

  const inv1 = await makeInvoice(customer.id, 500, "TEMP-1");
  console.log(`  Created invoice: ${inv1.invoiceNumber}`);

  await prisma.payment.deleteMany({ where: { invoiceId: inv1.id } });
  await prisma.invoice.delete({ where: { id: inv1.id } });
  console.log(`  Deleted invoice ${inv1.invoiceNumber}`);

  const inv2 = await makeInvoice(customer.id, 600, "TEMP-2");
  console.log(`  Created next invoice: ${inv2.invoiceNumber}`);
  const num1 = parseInt(inv1.invoiceNumber.split("-")[1], 10);
  const num2 = parseInt(inv2.invoiceNumber.split("-")[1], 10);
  if (num2 <= num1) {
    throw new Error(`Monotonicity failed: ${inv2.invoiceNumber} <= ${inv1.invoiceNumber}`);
  }
  console.log(`   Monotonicity verified (${inv1.invoiceNumber} -> deleted -> ${inv2.invoiceNumber})`);

  // Concurrency test: 5 simultaneous invoice creations
  console.log("  Testing concurrent invoice number generation...");
  const concBookings = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.booking.create({
        data: {
          companyId,
          bookingNumber: `BK-CONC-${i}-${testSuffix}`,
          customerId: customer.id,
          managerId: managerUser.user.id,
          scheduledDate: new Date(),
          pricingMethodId: perHourMethod.id,
          rate: 100,
          createdBy: ownerAuth.id,
        },
      }),
    ),
  );

  const concInvoices = await Promise.all(
    concBookings.map((b) =>
      invoiceRepository.create(companyId, {
        bookingId: b.id,
        customerId: customer.id,
        totalAmount: 100,
        paidAmount: 0,
        balanceAmount: 100,
      }),
    ),
  );

  const concNumbers = concInvoices.map((inv) => inv.invoiceNumber);
  const uniqueNumbers = new Set(concNumbers);
  if (uniqueNumbers.size !== 5) {
    throw new Error(`Concurrency test failed! Duplicate numbers generated: ${concNumbers.join(", ")}`);
  }
  console.log(`   Concurrency test passed! 5 distinct numbers: ${concNumbers.join(", ")}`);

  // These concurrency invoices would otherwise pollute the overpayment
  // spillover in the case matrix below (they belong to `customer`), so clear
  // them out of the "outstanding" set. Delete their (nonexistent) payments +
  // rows so they don't interfere.
  await prisma.invoice.deleteMany({ where: { id: { in: concInvoices.map((i) => i.id) } } });
  await prisma.invoice.deleteMany({ where: { id: inv2.id } });

  // ----------------------------------------------------
  // TEST 2: Job Completion Auto-Invoice Generation
  // ----------------------------------------------------
  console.log("\n[TEST 2] Job Completion & Auto-Invoice Generation");

  const booking = await prisma.booking.create({
    data: {
      companyId,
      bookingNumber: `BK-JOB-${testSuffix}`,
      customerId: customer.id,
      machineId: machine.id,
      driverId: driver.id,
      managerId: managerUser.user.id,
      scheduledDate: new Date(),
      pricingMethodId: perHourMethod.id,
      rate: 150, // Rs 150/hr
      createdBy: managerUser.user.id,
    },
  });

  const job = await prisma.job.create({
    data: {
      companyId,
      bookingId: booking.id,
      machineId: machine.id,
      driverId: driver.id,
      status: "WORKING",
      startTime: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
    },
  });

  const completedJob = await prisma.job.update({
    where: { id: job.id },
    data: { status: "COMPLETED", actualHours: 3.5, endTime: new Date() },
    include: { booking: { include: { pricingMethod: true } }, machine: true, driver: true },
  });

  const autoInvoice = await paymentService.createInvoiceForCompletedJob(companyId, completedJob);
  console.log(`  Auto-created invoice: ${autoInvoice.invoiceNumber}`);
  console.log(`  Rate: ${booking.rate}, Actual Hours: 3.5 -> Total Amount: ${autoInvoice.totalAmount}`);

  if (Number(autoInvoice.totalAmount) !== 525) {
    throw new Error(`Expected invoice total 525 (150 * 3.5), got ${autoInvoice.totalAmount}`);
  }
  if (autoInvoice.status !== "UNPAID") {
    throw new Error(`Expected UNPAID status, got ${autoInvoice.status}`);
  }
  if (Number(autoInvoice.balanceAmount) !== 525) {
    throw new Error(`Expected balance 525, got ${autoInvoice.balanceAmount}`);
  }
  console.log("   Auto-invoice generation verified cleanly");

  // ----------------------------------------------------
  // TEST 3: Partial Payment then Full Payment Lifecycle
  // ----------------------------------------------------
  console.log("\n[TEST 3] Partial Payment & Full Payment Lifecycle");

  // Partial Payment 1: Rs 200 via UPI
  const pay1 = await paymentService.receivePayment(companyId, autoInvoice.id, managerAuth, {
    amount: 200,
    paymentMethod: "UPI",
    referenceNumber: "UPI123456789",
    notes: "First partial payment via UPI",
  });

  console.log(`  Payment 1 (UPI 200): Invoice paid=${pay1.invoice.paidAmount}, balance=${pay1.invoice.balanceAmount}, status=${pay1.invoice.status}`);
  if (Number(pay1.invoice.paidAmount) !== 200 || Number(pay1.invoice.balanceAmount) !== 325 || pay1.invoice.status !== "PARTIALLY_PAID") {
    throw new Error("Partial payment 1 state incorrect");
  }
  if (pay1.creditCreated !== 0) throw new Error("Partial payment should not create credit");

  // Partial Payment 2: Rs 325 via CASH -> completes payment exactly
  const pay2 = await paymentService.receivePayment(companyId, autoInvoice.id, managerAuth, {
    amount: 325,
    paymentMethod: "CASH",
    notes: "Final payment in cash",
  });

  console.log(`  Payment 2 (CASH 325): Invoice paid=${pay2.invoice.paidAmount}, balance=${pay2.invoice.balanceAmount}, status=${pay2.invoice.status}`);
  if (Number(pay2.invoice.paidAmount) !== 525 || Number(pay2.invoice.balanceAmount) !== 0 || pay2.invoice.status !== "PAID") {
    throw new Error("Full payment state incorrect");
  }
  if (pay2.creditCreated !== 0) throw new Error("Exact payment should not create credit");

  // Attempt payment on fully paid invoice -> should reject
  let paidErrorCaught = false;
  try {
    await paymentService.receivePayment(companyId, autoInvoice.id, managerAuth, {
      amount: 10,
      paymentMethod: "CASH",
    });
  } catch (err: any) {
    paidErrorCaught = true;
    console.log(`  Payment on fully paid invoice rejected as expected: "${err.message}"`);
  }
  if (!paidErrorCaught) {
    throw new Error("Payment on fully paid invoice was not rejected!");
  }

  console.log("   Payment transaction lifecycle verified cleanly");

  // ----------------------------------------------------
  // TEST 5 (spec cases): Overpayment -> customer advance/credit
  // The standalone "Record Advance" feature was removed; excess payment now
  // becomes credit automatically inside the normal receive-payment flow.
  // ----------------------------------------------------
  console.log("\n[TEST 5] Overpayment -> automatic customer advance/credit");

  async function creditBalanceFor(custId: string): Promise<number> {
    const rows = await prisma.customerAdvance.findMany({ where: { companyId, customerId: custId } });
    return Math.round(rows.reduce((s, r) => s + (Number(r.amount) - Number(r.appliedAmount)), 0) * 100) / 100;
  }

  // Isolated customers so each case starts from a known-clean outstanding set.
  const cA = await prisma.customer.create({ data: { companyId, name: `CaseA_${testSuffix}`, phone: "9000000001" } });
  const cB = await prisma.customer.create({ data: { companyId, name: `CaseB_${testSuffix}`, phone: "9000000002" } });
  const cC = await prisma.customer.create({ data: { companyId, name: `CaseC_${testSuffix}`, phone: "9000000003" } });
  const cD = await prisma.customer.create({ data: { companyId, name: `CaseD_${testSuffix}`, phone: "9000000004" } });

  // Case A: outstanding 500 -> receive 300 => 300 applied, 200 outstanding, no credit
  const invA = await makeInvoice(cA.id, 500, "CASEA");
  const rA = await paymentService.receivePayment(companyId, invA.id, managerAuth, { amount: 300, paymentMethod: "CASH" });
  if (Number(rA.invoice.balanceAmount) !== 200 || rA.invoice.status !== "PARTIALLY_PAID") throw new Error("Case A invoice state wrong");
  if (rA.creditCreated !== 0 || (await creditBalanceFor(cA.id)) !== 0) throw new Error("Case A should create no credit");
  console.log("   Case A: 500 outstanding, pay 300 -> 200 balance, no credit ✓");

  // Case B: outstanding 500 -> receive 500 => 0 balance PAID, no credit
  const invB = await makeInvoice(cB.id, 500, "CASEB");
  const rB = await paymentService.receivePayment(companyId, invB.id, managerAuth, { amount: 500, paymentMethod: "CASH" });
  if (Number(rB.invoice.balanceAmount) !== 0 || rB.invoice.status !== "PAID") throw new Error("Case B invoice state wrong");
  if (rB.creditCreated !== 0 || (await creditBalanceFor(cB.id)) !== 0) throw new Error("Case B should create no credit");
  console.log("   Case B: 500 outstanding, pay 500 -> PAID, no credit ✓");

  // Case C: outstanding 500 (single invoice) -> receive 1000 => 500 applied, 500 credit
  const invC = await makeInvoice(cC.id, 500, "CASEC");
  const rC = await paymentService.receivePayment(companyId, invC.id, managerAuth, { amount: 1000, paymentMethod: "CASH" });
  if (Number(rC.invoice.balanceAmount) !== 0 || rC.invoice.status !== "PAID") throw new Error("Case C invoice state wrong");
  if (Number(rC.payment.amount) !== 500) throw new Error("Case C target payment should be capped at 500");
  if (rC.creditCreated !== 500 || (await creditBalanceFor(cC.id)) !== 500) throw new Error(`Case C should create 500 credit, got ${rC.creditCreated}`);
  console.log("   Case C: 500 outstanding, pay 1000 -> PAID + 500 credit ✓");

  // Case C-extended (spillover): two open invoices 500 + 300 -> receive 1000 on the first
  //   => first PAID (500), second PAID (300), 200 credit
  const invD1 = await makeInvoice(cD.id, 500, "CASED1");
  await makeInvoice(cD.id, 300, "CASED2");
  const rD = await paymentService.receivePayment(companyId, invD1.id, managerAuth, { amount: 1000, paymentMethod: "UPI" });
  if (Number(rD.invoice.balanceAmount) !== 0) throw new Error("Case D target invoice not settled");
  if (rD.overflowApplications.length !== 1 || rD.overflowApplications[0].amount !== 300) throw new Error(`Case D spillover wrong: ${JSON.stringify(rD.overflowApplications)}`);
  if (rD.creditCreated !== 200 || (await creditBalanceFor(cD.id)) !== 200) throw new Error(`Case D should create 200 credit, got ${rD.creditCreated}`);
  const cdInvoices = await invoiceRepository.findOutstandingForCustomer(companyId, cD.id);
  if (cdInvoices.length !== 0) throw new Error("Case D: all invoices should be settled after overpayment");
  console.log("   Case D (spillover): invoices 500+300, pay 1000 -> both PAID + 200 credit ✓");

  // ----------------------------------------------------
  // TEST 4: Scoped Read Verification & Receipt Generation
  // ----------------------------------------------------
  console.log("\n[TEST 4] Farmer Scoped Read & Receipt Generation");

  const farmerAuth = { id: farmerUser.user.id, companyId, roleId: farmerUser.user.roleId };
  const driverAuth = { id: driverUser.user.id, companyId, roleId: driverUser.user.roleId };

  const otherInv = await makeInvoice(otherCustomer.id, 900, "OTHER");

  // Owner sees all invoices
  const ownerInvoices = await paymentService.listInvoices(companyId, ownerAuth);
  console.log(`  Owner sees ${ownerInvoices.length} invoices`);
  if (ownerInvoices.length < 2) throw new Error("Owner listInvoices failed");

  // Farmer sees only their own invoices (not otherCustomer's invoice)
  const farmerInvoices = await paymentService.listInvoices(companyId, farmerAuth);
  console.log(`  Farmer sees ${farmerInvoices.length} invoices (out of ${ownerInvoices.length} total)`);
  if (!farmerInvoices.every((inv) => inv.customerId === customer.id)) {
    throw new Error("Farmer saw an invoice outside their customer profile!");
  }
  if (farmerInvoices.some((inv) => inv.id === otherInv.id)) {
    throw new Error("Farmer saw otherCustomer's invoice!");
  }

  // Driver sees 0 invoices
  const driverInvoices = await paymentService.listInvoices(companyId, driverAuth);
  console.log(`  Driver sees ${driverInvoices.length} invoices`);
  if (driverInvoices.length !== 0) {
    throw new Error("Driver saw invoices (financial access should be empty)");
  }

  // Receipt generation for Farmer
  const receipt = await paymentService.getReceipt(companyId, autoInvoice.id, farmerAuth);
  console.log(`  Structured Receipt generated: ${receipt.receiptNumber}`);
  console.log(`    Customer: ${receipt.customer.name} (${receipt.customer.village})`);
  console.log(`    Total Amount: ${receipt.invoice.totalAmount}, Status: ${receipt.invoice.status}`);
  console.log(`    Payments count: ${receipt.payments.length}`);

  if (receipt.payments.length !== 2) {
    throw new Error(`Expected 2 payments in receipt, got ${receipt.payments.length}`);
  }
  console.log("   Scoped read & structured receipt generation verified");

  // ----------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------
  console.log("\nCleaning up test data...");
  const userIds = [managerUser.user.id, farmerUser.user.id, driverUser.user.id];
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.customerAdvance.deleteMany({ where: { companyId } });
  await prisma.payment.deleteMany({ where: { companyId } });
  await prisma.invoice.deleteMany({ where: { companyId } });
  await prisma.jobStatusLog.deleteMany({ where: { companyId } });
  await prisma.jobWorkSession.deleteMany({ where: { companyId } });
  await prisma.jobTransportCharge.deleteMany({ where: { companyId } });
  await prisma.job.deleteMany({ where: { companyId } });
  await prisma.booking.deleteMany({ where: { companyId } });
  await prisma.machine.deleteMany({ where: { companyId } });
  await prisma.driver.deleteMany({ where: { companyId } });
  await prisma.staffInvite.deleteMany({ where: { companyId } });
  await prisma.employee.deleteMany({ where: { companyId } });
  await prisma.customer.deleteMany({ where: { companyId } });
  await prisma.machineType.deleteMany({ where: { companyId } });
  await prisma.pricingMethod.deleteMany({ where: { companyId } });
  // managerUser/farmerUser/driverUser are created via authService.register(),
  // which resolves its own company internally rather than using ownerAuth's
  // companyId — in this in-process test call (no tenant header to guide it)
  // that lands them in the shared pilot company, not this disposable one. A
  // companyId-scoped delete alone would miss them entirely, silently leaking
  // 3 synthetic users into pilot every run. Delete by explicit id as well so
  // they're removed regardless of which company they actually ended up in.
  await prisma.user.deleteMany({ where: { OR: [{ companyId }, { id: { in: userIds } }] } });
  // Roles/permissions are now seeded per-company (seedCompanyRoles) so tests
  // are order-independent; tear them down before the company FK check.
  const companyRoles = await prisma.role.findMany({ where: { companyId }, select: { id: true } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: companyRoles.map((r) => r.id) } } });
  await prisma.role.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });

  console.log(" Cleanup finished successfully!");
  console.log("\n ALL PAYMENTS & INVOICES TESTS PASSED SUCCESSFULLY!\n");
}

runTests()
  .catch((err) => {
    console.error(" Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
