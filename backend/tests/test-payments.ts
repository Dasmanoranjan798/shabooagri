import { prisma } from "../src/db/prisma";
import * as authService from "../src/modules/auth/auth.service";
import * as invoiceRepository from "../src/modules/payments/invoice.repository";
import * as paymentService from "../src/modules/payments/payment.service";

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

  const ownerRole = await prisma.role.findFirstOrThrow({ where: { systemKey: "owner" } });
  const ownerUser = await prisma.user.create({
    data: {
      companyId,
      roleId: ownerRole.id,
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

  // 2. Setup Master Data
  const village = await prisma.village.create({
    data: { companyId, name: `Village_${testSuffix}` },
  });

  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: `Farmer_${testSuffix}`,
      villageId: village.id,
      userId: farmerUser.user.id,
      phone: "9876543210",
    },
  });

  const otherCustomer = await prisma.customer.create({
    data: {
      companyId,
      name: `OtherFarmer_${testSuffix}`,
      villageId: village.id,
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

  console.log(" User & Master Data setup complete");

  // ----------------------------------------------------
  // TEST 1: Monotonic Counter & Delete-Adjacent Scenarios + Concurrency
  // ----------------------------------------------------
  console.log("\n[TEST 1] Monotonic Invoice Counter & Concurrency");
  
  // Create an invoice directly
  const inv1 = await invoiceRepository.create(companyId, {
    bookingId: (await prisma.booking.create({
      data: {
        companyId,
        bookingNumber: `BK-TEMP-1-${testSuffix}`,
        customerId: customer.id,
        villageId: village.id,
        managerId: managerUser.user.id,
        scheduledDate: new Date(),
        pricingMethodId: perHourMethod.id,
        rate: 100,
        createdBy: ownerAuth.id,
      },
    })).id,
    customerId: customer.id,
    totalAmount: 500,
    paidAmount: 0,
    balanceAmount: 500,
  });

  console.log(`  Created invoice: ${inv1.invoiceNumber}`);

  // Delete invoice 1
  await invoiceRepository.deleteScoped(companyId, inv1.id);
  console.log(`  Deleted invoice ${inv1.invoiceNumber}`);

  // Create invoice 2 -> must NOT reuse inv1's number
  const inv2 = await invoiceRepository.create(companyId, {
    bookingId: (await prisma.booking.create({
      data: {
        companyId,
        bookingNumber: `BK-TEMP-2-${testSuffix}`,
        customerId: customer.id,
        villageId: village.id,
        managerId: managerUser.user.id,
        scheduledDate: new Date(),
        pricingMethodId: perHourMethod.id,
        rate: 100,
        createdBy: ownerAuth.id,
      },
    })).id,
    customerId: customer.id,
    totalAmount: 600,
    paidAmount: 0,
    balanceAmount: 600,
  });

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
          villageId: village.id,
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

  // ----------------------------------------------------
  // TEST 2: Job Completion Auto-Invoice Generation
  // ----------------------------------------------------
  console.log("\n[TEST 2] Job Completion & Auto-Invoice Generation");

  const booking = await prisma.booking.create({
    data: {
      companyId,
      bookingNumber: `BK-JOB-${testSuffix}`,
      customerId: customer.id,
      villageId: village.id,
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

  // Complete job with actualHours = 3.5
  const jobWithRelations = await prisma.job.findUnique({
    where: { id: job.id },
    include: { booking: { include: { pricingMethod: true } }, machine: true, driver: true },
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

  const managerAuth = { id: managerUser.user.id, companyId, roleId: managerUser.user.roleId };

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

  // Attempt overpayment: Rs 400 (exceeds balance 325)
  let overpayErrorCaught = false;
  try {
    await paymentService.receivePayment(companyId, autoInvoice.id, managerAuth, {
      amount: 400,
      paymentMethod: "CASH",
    });
  } catch (err: any) {
    overpayErrorCaught = true;
    console.log(`  Overpayment rejected as expected: "${err.message}"`);
  }
  if (!overpayErrorCaught) {
    throw new Error("Overpayment was not rejected!");
  }

  // Partial Payment 2: Rs 325 via CASH -> completes payment
  const pay2 = await paymentService.receivePayment(companyId, autoInvoice.id, managerAuth, {
    amount: 325,
    paymentMethod: "CASH",
    notes: "Final payment in cash",
  });

  console.log(`  Payment 2 (CASH 325): Invoice paid=${pay2.invoice.paidAmount}, balance=${pay2.invoice.balanceAmount}, status=${pay2.invoice.status}`);
  if (Number(pay2.invoice.paidAmount) !== 525 || Number(pay2.invoice.balanceAmount) !== 0 || pay2.invoice.status !== "PAID") {
    throw new Error("Full payment state incorrect");
  }

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
  // TEST 4: Scoped Read Verification & Receipt Generation
  // ----------------------------------------------------
  console.log("\n[TEST 4] Farmer Scoped Read & Receipt Generation");

  const farmerAuth = { id: farmerUser.user.id, companyId, roleId: farmerUser.user.roleId };
  const driverAuth = { id: driverUser.user.id, companyId, roleId: driverUser.user.roleId };

  // Create an invoice for otherCustomer to verify Farmer scope isolation
  const otherInv = await invoiceRepository.create(companyId, {
    bookingId: (await prisma.booking.create({
      data: {
        companyId,
        bookingNumber: `BK-OTHER-${testSuffix}`,
        customerId: otherCustomer.id,
        villageId: village.id,
        managerId: managerUser.user.id,
        scheduledDate: new Date(),
        pricingMethodId: perHourMethod.id,
        rate: 100,
        createdBy: ownerAuth.id,
      },
    })).id,
    customerId: otherCustomer.id,
    totalAmount: 900,
    paidAmount: 0,
    balanceAmount: 900,
  });

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
  console.log(`    Company: ${receipt.company.name}`);
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
  await prisma.payment.deleteMany({ where: { companyId } });
  await prisma.invoice.deleteMany({ where: { companyId } });
  await prisma.jobStatusLog.deleteMany({ where: { companyId } });
  await prisma.job.deleteMany({ where: { companyId } });
  await prisma.booking.deleteMany({ where: { companyId } });
  await prisma.machine.deleteMany({ where: { companyId } });
  await prisma.driver.deleteMany({ where: { companyId } });
  await prisma.staffInvite.deleteMany({ where: { companyId } });
  await prisma.employee.deleteMany({ where: { companyId } });
  await prisma.customer.deleteMany({ where: { companyId } });
  await prisma.village.deleteMany({ where: { companyId } });
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
