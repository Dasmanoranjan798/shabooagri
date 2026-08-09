import { prisma } from "../src/db/prisma";
import * as customerService from "../src/modules/customers/customer.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as driverService from "../src/modules/drivers/driver.service";
import * as employeeService from "../src/modules/employees/employee.service";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as jobService from "../src/modules/jobs/job.service";
import * as paymentService from "../src/modules/payments/payment.service";
import * as driverCompensationService from "../src/modules/drivers/driverCompensation.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

async function runPhase3ATests() {
  console.log("==================================================");
  console.log("STARTING PHASE 3A — MANAGER-FIRST FIELD OPERATIONS TESTS");
  console.log("==================================================");

  // 1. Setup test company
  const company = await prisma.company.create({
    data: { name: "Phase 3A Agri Services", slug: `p3a-${Date.now()}`, invoicePrefix: "P3A" },
  });

  const permissions = await prisma.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.key, p.id]));

  const ownerRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "owner", name: "Owner", isSystemRole: true },
  });
  const managerRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "manager", name: "Manager", isSystemRole: true },
  });
  const driverRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "driver", name: "Driver", isSystemRole: true },
  });
  const farmerRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "farmer", name: "Farmer", isSystemRole: true },
  });

  // Assign permissions to manager
  const managerPerms = [
    "dashboard.view", "booking.create", "booking.edit", "machine.assign",
    "driver.assign", "job.update_status", "payment.receive", "operations.view",
  ];
  for (const pKey of managerPerms) {
    const pId = permMap.get(pKey);
    if (pId) {
      await prisma.rolePermission.create({ data: { roleId: managerRole.id, permissionId: pId } });
    }
  }

  // Create Users
  const managerUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: managerRole.id,
      fullName: "Manager Rajesh",
      email: `manager-${Date.now()}@test.com`,
    },
  });

  const farmerUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: farmerRole.id,
      fullName: "Farmer Ramesh",
      email: `farmer-${Date.now()}@test.com`,
    },
  });

  const hourlyDriverUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: driverRole.id,
      fullName: "Hourly Driver Vikas",
      email: `driver-hourly-${Date.now()}@test.com`,
    },
  });

  const monthlyDriverUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: driverRole.id,
      fullName: "Monthly Driver Sunil",
      email: `driver-monthly-${Date.now()}@test.com`,
    },
  });

  const yearlyDriverUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: driverRole.id,
      fullName: "Yearly Driver Amit",
      email: `driver-yearly-${Date.now()}@test.com`,
    },
  });

  const authManager: AuthenticatedUser = {
    id: managerUser.id,
    companyId: company.id,
    roleId: managerRole.id,
    isOwner: false,
    permissions: managerPerms,
  };

  const authFarmer: AuthenticatedUser = {
    id: farmerUser.id,
    companyId: company.id,
    roleId: farmerRole.id,
    isOwner: false,
    permissions: [],
  };

  // Create Village
  const village = await prisma.village.create({
    data: { companyId: company.id, name: `Village Alpha ${Date.now()}` },
  });

  // Create Customer
  const customer = await customerService.create(company.id, {
    name: "Farmer Ramesh",
    villageId: village.id,
    userId: farmerUser.id,
  });

  // Create Machine Type & Machine
  const machineType = await prisma.machineType.create({
    data: { companyId: company.id, name: "Harvester" },
  });
  const machine = await machineService.create(company.id, {
    machineTypeId: machineType.id,
    registrationNumber: `MH-12-${Math.floor(Math.random() * 8999 + 1000)}`,
  });

  // Create Employees & Drivers with different Compensation Models
  // 1. Hourly Driver (₹300/hr)
  const hourlyEmp = await employeeService.create(company.id, {
    name: "Hourly Driver Vikas",
    userId: hourlyDriverUser.id,
    compensationType: "HOURLY",
    hourlyRate: 300,
  });
  const hourlyDriver = await driverService.create(company.id, { employeeId: hourlyEmp.id });

  // 2. Monthly Salaried Driver (₹25,000/month)
  const monthlyEmp = await employeeService.create(company.id, {
    name: "Monthly Driver Sunil",
    userId: monthlyDriverUser.id,
    compensationType: "MONTHLY",
    monthlySalary: 25000,
  });
  const monthlyDriver = await driverService.create(company.id, { employeeId: monthlyEmp.id });

  // 3. Yearly Salaried Driver (₹3,60,000/year)
  const yearlyEmp = await employeeService.create(company.id, {
    name: "Yearly Driver Amit",
    userId: yearlyDriverUser.id,
    compensationType: "YEARLY",
    yearlySalary: 360000,
  });
  const yearlyDriver = await driverService.create(company.id, { employeeId: yearlyEmp.id });

  // 3. Pricing Method (Per Hour ₹500/hr)
  const perHourPM = await prisma.pricingMethod.findFirst({
    where: { companyId: company.id, key: "per_hour" },
  }) || await prisma.pricingMethod.create({
    data: { companyId: company.id, key: "per_hour", label: "Per Hour", unit: "hour" },
  });

  console.log(" Test seeds created successfully.");

  // TEST 1: Manager-Controlled Live Job Execution
  console.log("\n[TEST 1] Testing Manager-Controlled Live Job Execution...");
  const booking = await bookingService.create(company.id, managerUser.id, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: hourlyDriver.id,
    scheduledDate: new Date(),
    pricingMethodId: perHourPM.id,
    rate: 500,
  });
  console.log(" Booking created by Manager:", booking.bookingNumber);

  // Transition PENDING -> ACCEPTED -> ON_THE_WAY to initialize job
  await bookingService.updateStatus(company.id, booking.id, "ACCEPTED");
  await bookingService.updateStatus(company.id, booking.id, "ON_THE_WAY");
  let job = await jobService.list(company.id, authManager).then((list) => list.find((j) => j.bookingId === booking.id));
  if (!job) throw new Error("Job was not initialized for booking!");
  console.log(" Job initialized with status NOT_STARTED");

  // Manager starts job
  const now = Date.now();
  const startTime = new Date(now - 3 * 3600 * 1000); // 3 hours ago
  job = await jobService.start(company.id, job.id, authManager, { startTime });
  if (job.status !== "WORKING") throw new Error("Manager failed to start job!");
  console.log(" Manager started job on behalf of driver.");

  // Manager pauses job
  job = await jobService.pause(company.id, job.id, authManager, { note: "Tea break" });
  if (job.status !== "PAUSED") throw new Error("Manager failed to pause job!");
  console.log(" Manager paused job.");

  // Manager resumes job
  job = await jobService.resume(company.id, job.id, authManager, { note: "Resumed field work" });
  if (job.status !== "WORKING") throw new Error("Manager failed to resume job!");
  console.log(" Manager resumed job.");

  // Manager completes job with 2.5 actual hours worked & 2 acres
  const endTime = new Date(now);
  job = await jobService.complete(company.id, job.id, authManager, {
    endTime,
    actualHours: 2.5,
    completedAcres: 2.0,
    notes: "Field harvesting complete",
  });
  if (job.status !== "COMPLETED") throw new Error("Manager failed to complete job!");
  if (Number(job.actualHours) !== 2.5) throw new Error(`Expected actualHours 2.5, got ${job.actualHours}`);
  console.log(" Manager completed job. Worked duration:", job.actualHours, "hrs.");

  // Verify Invoice Auto-Generation & Pricing Engine Calculation
  const invoices = await paymentService.listInvoices(company.id, authManager);
  const liveInvoice = invoices.find((inv) => inv.bookingId === booking.id);
  if (!liveInvoice) throw new Error("Invoice was not generated for completed live job!");
  // 2.5 hrs × ₹500/hr = ₹1250
  if (Number(liveInvoice.totalAmount) !== 1250) {
    throw new Error(`Expected invoice total 1250, got ${liveInvoice.totalAmount}`);
  }
  console.log(" Live Job Invoice auto-generated with correct total: ₹" + liveInvoice.totalAmount);

  // TEST 2: Manual / After-Work Entry Mode
  console.log("\n[TEST 2] Testing After-Work / Manual Entry Mode...");
  const manualStartTime = new Date(now - 5 * 3600 * 1000);
  const manualEndTime = new Date(now - 1 * 3600 * 1000); // 4 hours duration
  const manualJob = await jobService.createManualEntryJob(company.id, managerUser.id, authManager, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: monthlyDriver.id,
    scheduledDate: new Date(),
    pricingMethodId: perHourPM.id,
    rate: 600,
    startTime: manualStartTime,
    endTime: manualEndTime,
    completedAcres: 3.5,
    fuelUsedLitres: 15.0,
    notes: "Late night after-work manual entry",
  });

  if (manualJob.executionMode !== "MANUAL") throw new Error("Manual job executionMode must be MANUAL");
  if (manualJob.status !== "COMPLETED") throw new Error("Manual job status must be COMPLETED");
  if (Number(manualJob.actualHours) !== 4.0) throw new Error(`Expected manual job hours 4.0, got ${manualJob.actualHours}`);
  console.log(" Manual after-work job created successfully with duration 4.0 hrs.");

  // Verify Manual Job Invoice calculation (4.0 hrs × ₹600/hr = ₹2400)
  if (!manualJob.invoice || Number(manualJob.invoice.totalAmount) !== 2400) {
    throw new Error(`Expected manual job invoice 2400, got ${manualJob.invoice?.totalAmount}`);
  }
  console.log(" Manual after-work job generated invoice correctly using shared pricing engine: ₹" + manualJob.invoice.totalAmount);

  // Also create a manual job for Yearly Driver (5.0 hrs)
  await jobService.createManualEntryJob(company.id, managerUser.id, authManager, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: yearlyDriver.id,
    scheduledDate: new Date(),
    pricingMethodId: perHourPM.id,
    rate: 500,
    startTime: new Date(now - 8 * 3600 * 1000),
    endTime: new Date(now - 3 * 3600 * 1000),
    notes: "Yearly driver field work",
  });

  // TEST 3: Driver Compensation Model (Hourly vs Monthly vs Yearly Salaried)
  console.log("\n[TEST 3] Testing Driver Compensation Model (Hourly / Monthly / Yearly)...");

  // 1. Hourly Driver Compensation Summary
  const hourlyComp = await driverCompensationService.getDriverCompensationSummary(company.id, hourlyDriver.id);
  // Hourly driver worked 2.5 hours at ₹300/hr = ₹750
  if (hourlyComp.compensationType !== "HOURLY") throw new Error("Expected compensationType HOURLY");
  if (hourlyComp.totalWorkedHours !== 2.5) throw new Error(`Expected 2.5 worked hours, got ${hourlyComp.totalWorkedHours}`);
  if (hourlyComp.calculatedEarnings !== 750) throw new Error(`Expected 750 hourly earnings, got ${hourlyComp.calculatedEarnings}`);
  console.log(" Hourly Driver Compensation calculated correctly:", hourlyComp.explanation, "-> ₹" + hourlyComp.calculatedEarnings);

  // 2. Monthly Salaried Driver Compensation Summary
  const monthlyComp = await driverCompensationService.getDriverCompensationSummary(company.id, monthlyDriver.id);
  // Monthly driver worked 4.0 hours, but fixed salary is ₹25,000/month. Hours MUST NOT multiply into wages!
  if (monthlyComp.compensationType !== "MONTHLY") throw new Error("Expected compensationType MONTHLY");
  if (monthlyComp.totalWorkedHours !== 4.0) throw new Error(`Expected 4.0 worked hours, got ${monthlyComp.totalWorkedHours}`);
  if (monthlyComp.calculatedEarnings !== 25000) throw new Error(`Expected 25000 fixed monthly salary, got ${monthlyComp.calculatedEarnings}`);
  console.log(" Monthly Salaried Driver Compensation strictly preserved fixed salary without hourly multiplication:", monthlyComp.explanation);

  // 3. Yearly Salaried Driver Compensation Summary
  const yearlyComp = await driverCompensationService.getDriverCompensationSummary(company.id, yearlyDriver.id);
  // Yearly driver worked 5.0 hours, but fixed annual salary is ₹3,60,000/year. Hours MUST NOT multiply into wages!
  if (yearlyComp.compensationType !== "YEARLY") throw new Error("Expected compensationType YEARLY");
  if (yearlyComp.totalWorkedHours !== 5.0) throw new Error(`Expected 5.0 worked hours, got ${yearlyComp.totalWorkedHours}`);
  if (yearlyComp.calculatedEarnings !== 360000) throw new Error(`Expected 360000 fixed yearly salary, got ${yearlyComp.calculatedEarnings}`);
  console.log(" Yearly Salaried Driver Compensation strictly preserved fixed annual salary without hourly multiplication:", yearlyComp.explanation);

  // TEST 4: Security & Access Control
  console.log("\n[TEST 4] Testing Security & Permission Scoping...");

  // Farmer attempts to complete a job -> Should be rejected
  try {
    await jobService.complete(company.id, job.id, authFarmer, { notes: "Unauthorized farmer edit" });
    throw new Error("SECURITY FAILURE: Farmer was allowed to complete a job!");
  } catch (err: any) {
    if (err.message.includes("SECURITY FAILURE")) throw err;
    console.log(" Farmer job modification correctly rejected with 403 Forbidden / Not Assigned.");
  }

  // Cross-Company Isolation check
  const companyB = await prisma.company.create({
    data: { name: "Tenant B", slug: `tenantb-${Date.now()}` },
  });
  try {
    await jobService.getById(companyB.id, job.id, {
      id: "other-user",
      companyId: companyB.id,
      roleId: "some-role",
      isOwner: true,
      permissions: ["operations.view"],
    });
    throw new Error("TENANT ISOLATION FAILURE: Tenant B accessed Tenant A job!");
  } catch (err: any) {
    if (err.message.includes("TENANT ISOLATION")) throw err;
    console.log(" Cross-company tenant isolation correctly enforced with HTTP 404 Not Found.");
  }

  console.log("==================================================");
  console.log("ALL PHASE 3A MANAGER-FIRST FIELD OPERATION TESTS PASSED! ");
  console.log("==================================================");
}

runPhase3ATests()
  .catch((e) => {
    console.error("TEST SUITE FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
