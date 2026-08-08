import { prisma } from "../src/db/prisma";
import * as authService from "../src/modules/auth/auth.service";
import * as dashboardService from "../src/modules/dashboard/dashboard.service";
import { AppError } from "../src/shared/errors/AppError";

async function runTests() {
  console.log("Starting Dashboard module end-to-end integration tests...\n");

  // 1. Fetch pilot company
  const company = await prisma.company.findUnique({ where: { slug: "pilot" } });
  if (!company) throw new Error("Pilot company missing. Run seed first.");
  const companyId = company.id;

  const testSuffix = Date.now().toString();

  // 2. Setup users for roles
  const existingOwner = await prisma.user.findFirst({
    where: { companyId, role: { systemKey: "owner" } },
  });

  let ownerAuth: { id: string; companyId: string; roleId: string };
  let ownerUserRecord: { id: string; companyId: string; roleId: string; email: string };
  if (existingOwner) {
    ownerAuth = { id: existingOwner.id, companyId: existingOwner.companyId, roleId: existingOwner.roleId };
    ownerUserRecord = { id: existingOwner.id, companyId: existingOwner.companyId, roleId: existingOwner.roleId, email: existingOwner.email };
  } else {
    const ownerRes = await authService.register({
      fullName: "Test Owner",
      email: `owner_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "owner",
    });
    ownerAuth = { id: ownerRes.user.id, companyId, roleId: ownerRes.user.roleId };
    ownerUserRecord = { id: ownerRes.user.id, companyId, roleId: ownerRes.user.roleId, email: ownerRes.user.email };
  }

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

  // 3. Setup master data (Village, Customer, MachineType, Employee, Driver, Machine, PricingMethod)
  const village = await prisma.village.create({
    data: { companyId, name: `DashVillage_${testSuffix}` },
  });

  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: `DashFarmer_${testSuffix}`,
      villageId: village.id,
      userId: farmerUser.user.id,
      phone: "9876543211",
    },
  });

  const machineType = await prisma.machineType.create({
    data: { companyId, name: `Tractor_${testSuffix}` },
  });

  const employee = await prisma.employee.create({
    data: { companyId, name: `Driver_Emp_${testSuffix}`, userId: driverUser.user.id },
  });

  const driver = await prisma.driver.create({
    data: { companyId, employeeId: employee.id, availabilityStatus: "AVAILABLE" },
  });

  const machine = await prisma.machine.create({
    data: {
      companyId,
      machineTypeId: machineType.id,
      registrationNumber: `REG-${testSuffix}`,
      brand: "Mahindra",
      model: "575 DI",
      status: "WORKING",
      assignedDriverId: driver.id,
    },
  });

  const pricingMethod = await prisma.pricingMethod.findFirstOrThrow({
    where: { companyId, key: "per_hour" },
  });

  // 4. Setup today's booking, job, invoice, payment, fuel
  const todayDate = new Date(Date.now() + 6 * 3600 * 1000);

  const booking = await prisma.booking.create({
    data: {
      companyId,
      bookingNumber: `BK-DASH-${testSuffix}`,
      customerId: customer.id,
      villageId: village.id,
      machineId: machine.id,
      driverId: driver.id,
      managerId: managerUser.user.id,
      createdBy: ownerUserRecord.id,
      scheduledDate: todayDate,
      scheduledTime: todayDate,
      pricingMethodId: pricingMethod.id,
      rate: 500,
      estimatedHours: 2,
      status: "WORKING",
    },
  });

  const job = await prisma.job.create({
    data: {
      companyId,
      bookingId: booking.id,
      machineId: machine.id,
      driverId: driver.id,
      status: "WORKING",
      startTime: todayDate,
      actualHours: 2,
      completedAcres: 5,
      fuelUsedLitres: 15,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      bookingId: booking.id,
      customerId: customer.id,
      invoiceNumber: `INV-DASH-${testSuffix}`,
      totalAmount: 1000,
      paidAmount: 400,
      balanceAmount: 600,
      status: "PARTIALLY_PAID",
      invoiceDate: todayDate,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      companyId,
      invoiceId: invoice.id,
      amount: 400,
      paymentMethod: "CASH",
      receivedAt: todayDate,
      receivedBy: ownerUserRecord.id,
    },
  });

  const fuelEntry = await prisma.jobFuelEntry.create({
    data: {
      companyId,
      jobId: job.id,
      machineId: machine.id,
      litres: 15,
      cost: 1500,
      recordedBy: ownerUserRecord.id,
      recordedAt: todayDate,
    },
  });

  // 5. Setup second company for company-scoping isolation tests
  const secondCompany = await prisma.company.create({
    data: { name: `Second Company ${testSuffix}`, slug: `second-${testSuffix}` },
  });
  const secondRole = await prisma.role.create({
    data: {
      companyId: secondCompany.id,
      systemKey: "owner",
      name: "Owner",
      isSystemRole: true,
    },
  });
  const opsViewPerm = await prisma.permission.findUniqueOrThrow({
    where: { key: "operations.view" },
  });
  await prisma.rolePermission.create({
    data: {
      roleId: secondRole.id,
      permissionId: opsViewPerm.id,
    },
  });
  const secondOwnerUser = await prisma.user.create({
    data: {
      companyId: secondCompany.id,
      roleId: secondRole.id,
      fullName: "Second Owner",
      email: `owner2_${testSuffix}@example.com`,
    },
  });
  const secondMachineType = await prisma.machineType.create({
    data: { companyId: secondCompany.id, name: "Harvester" },
  });
  await prisma.machine.create({
    data: {
      companyId: secondCompany.id,
      machineTypeId: secondMachineType.id,
      registrationNumber: `REG2-${testSuffix}`,
      status: "WORKING",
    },
  });

  console.log("Synthetic test data created successfully.\n");

  try {
    // TEST 1: Owner Summary Access & KPI verification
    console.log("Test 1: Owner Summary Access & KPI Calculations...");
    const ownerSummary = await dashboardService.getSummary(companyId, ownerUserRecord as any);
    if (ownerSummary.scope !== "company") throw new Error("Expected company scope for owner");
    if (!ownerSummary.kpis) throw new Error("KPIs missing for owner");
    const revenueVal = ownerSummary.kpis.todayRevenue.current || ownerSummary.kpis.todayRevenue.previous;
    if (revenueVal < 400) throw new Error("Today's revenue calculation incorrect");
    if (ownerSummary.kpis.pendingCollection.current < 600) throw new Error("Pending collection calculation incorrect");
    if (ownerSummary.kpis.machinesWorking.working < 1) throw new Error("Machines working count incorrect");
    const driversVal = ownerSummary.kpis.driversActive.current || ownerSummary.kpis.driversActive.previous;
    if (driversVal < 1) throw new Error("Drivers active count incorrect");

    if (!ownerSummary.machineStatus) throw new Error("Machine status breakdown missing");
    if (ownerSummary.machineStatus.WORKING < 1) throw new Error("Machine status WORKING count incorrect");

    if (ownerSummary.todaysJobs.length < 1) throw new Error("Today's jobs list empty");
    const foundJob = ownerSummary.todaysJobs.find((j) => j.jobId === job.id);
    if (!foundJob) throw new Error("Test job missing from today's jobs");
    if (foundJob.customer.name !== customer.name) throw new Error("Customer name mismatch on job");

    if (ownerSummary.pendingPayments.length < 1) throw new Error("Pending payments list empty");
    const foundInvoice = ownerSummary.pendingPayments.find((i) => i.invoiceId === invoice.id);
    if (!foundInvoice) throw new Error("Test invoice missing from pending payments");
    if (foundInvoice.balanceAmount !== 600) throw new Error("Balance amount mismatch on pending invoice");
    console.log("  PASSED");

    // TEST 2: Manager Summary Access
    console.log("\nTest 2: Manager Summary Access...");
    const managerSummary = await dashboardService.getSummary(companyId, managerUser.user as any);
    if (managerSummary.scope !== "company") throw new Error("Expected company scope for manager");
    if (!managerSummary.kpis) throw new Error("KPIs missing for manager");
    console.log("  PASSED");

    // TEST 3: Driver Summary Access (Scoped to Driver's own jobs, no KPIs)
    console.log("\nTest 3: Driver Summary Access...");
    const driverSummary = await dashboardService.getSummary(companyId, driverUser.user as any);
    if (driverSummary.scope !== "driver") throw new Error("Expected driver scope for driver");
    if (driverSummary.kpis !== null) throw new Error("Driver must not receive financial KPIs");
    if (driverSummary.machineStatus !== null) throw new Error("Driver must not receive company machine status");
    if (driverSummary.pendingPayments !== null) throw new Error("Driver must not receive pending payments");
    if (driverSummary.todaysJobs.length !== 1) throw new Error("Driver should receive exactly their assigned job");
    if (driverSummary.todaysJobs[0].jobId !== job.id) throw new Error("Driver received wrong job");
    console.log("  PASSED");

    // TEST 4: Farmer Summary Rejection
    console.log("\nTest 4: Farmer Summary Rejection...");
    let farmerError: AppError | null = null;
    try {
      await dashboardService.getSummary(companyId, farmerUser.user as any);
    } catch (err) {
      if (err instanceof AppError) farmerError = err;
    }
    if (!farmerError || farmerError.statusCode !== 403) {
      throw new Error(`Farmer summary request should fail with 403, got ${farmerError?.statusCode}`);
    }
    console.log("  PASSED");

    // TEST 5: Income Overview Series
    console.log("\nTest 5: Income Overview Series (7d, 30d, 90d, 12m)...");
    const income30d = await dashboardService.getIncomeSeries(companyId, ownerUserRecord as any, "30d");
    if (income30d.granularity !== "day") throw new Error("Expected day granularity for 30d");
    if (income30d.data.length === 0) throw new Error("Income series data empty for 30d");

    const income12m = await dashboardService.getIncomeSeries(companyId, ownerUserRecord as any, "12m");
    if (income12m.granularity !== "month") throw new Error("Expected month granularity for 12m");

    // Driver income series rejection
    let driverIncomeErr: AppError | null = null;
    try {
      await dashboardService.getIncomeSeries(companyId, driverUser.user as any, "30d");
    } catch (err) {
      if (err instanceof AppError) driverIncomeErr = err;
    }
    if (!driverIncomeErr || driverIncomeErr.statusCode !== 403) {
      throw new Error("Driver income series request should fail with 403");
    }
    console.log("  PASSED");

    // TEST 6: Fuel Series
    console.log("\nTest 6: Fuel Series Aggregation...");
    const fuel30d = await dashboardService.getFuelSeries(companyId, ownerUserRecord as any, "30d");
    if (fuel30d.granularity !== "day") throw new Error("Expected day granularity for fuel 30d");
    if (fuel30d.data.length === 0) throw new Error("Fuel series data empty for 30d");
    const fuelSum = fuel30d.data.reduce((acc, d) => acc + d.litres, 0);
    if (fuelSum < 15) throw new Error("Fuel litres sum mismatch");

    // Driver fuel series rejection
    let driverFuelErr: AppError | null = null;
    try {
      await dashboardService.getFuelSeries(companyId, driverUser.user as any, "30d");
    } catch (err) {
      if (err instanceof AppError) driverFuelErr = err;
    }
    if (!driverFuelErr || driverFuelErr.statusCode !== 403) {
      throw new Error("Driver fuel series request should fail with 403");
    }
    console.log("  PASSED");

    // TEST 7: Company Scoping Isolation
    console.log("\nTest 7: Company Scoping Isolation...");
    const secondOwnerSummary = await dashboardService.getSummary(secondCompany.id, {
      id: secondOwnerUser.id,
      companyId: secondCompany.id,
      roleId: secondOwnerUser.roleId,
      email: secondOwnerUser.email,
    } as any);
    if (secondOwnerSummary.kpis?.todayRevenue.current !== 0) {
      throw new Error("Second company today revenue should be 0");
    }
    if (secondOwnerSummary.todaysJobs.length !== 0) {
      throw new Error("Second company today's jobs should be empty");
    }
    console.log("  PASSED");

    // TEST 8: Sensitive Fields Protection
    console.log("\nTest 8: Sensitive Fields Protection...");
    const summaryJson = JSON.stringify(ownerSummary);
    if (
      summaryJson.includes("passwordHash") ||
      summaryJson.includes("pinHash") ||
      summaryJson.includes("password")
    ) {
      throw new Error("Security leak: response contains sensitive credential fields!");
    }
    console.log("  PASSED");

    console.log("\nALL DASHBOARD TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    console.log("Cleaning up synthetic test data...");
    await prisma.jobFuelEntry.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.jobStatusLog.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.payment.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.invoice.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.job.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.booking.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.machine.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.driver.deleteMany({ where: { id: driver.id } });
    await prisma.employee.deleteMany({ where: { id: employee.id } });
    await prisma.machineType.deleteMany({ where: { companyId: { in: [companyId, secondCompany.id] } } });
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.village.deleteMany({ where: { id: village.id } });
    const userIds = [
      managerUser.user.id,
      farmerUser.user.id,
      driverUser.user.id,
      secondOwnerUser.id,
    ];
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: secondRole.id } });
    await prisma.role.deleteMany({ where: { id: secondRole.id } });
    await prisma.company.deleteMany({ where: { id: secondCompany.id } });
    console.log("Cleanup complete.");
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
