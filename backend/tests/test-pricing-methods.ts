import { prisma } from "../src/db/prisma";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as customerService from "../src/modules/customers/customer.service";
import * as driverService from "../src/modules/drivers/driver.service";
import * as employeeService from "../src/modules/employees/employee.service";
import * as jobService from "../src/modules/jobs/job.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as paymentService from "../src/modules/payments/payment.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";
import { calculateAmount } from "../src/shared/pricing/pricing-calculator";

async function runPricingTests() {
  console.log("==================================================");
  console.log("STARTING FOUR PRICING METHODS END-TO-END TEST");
  console.log("==================================================");

  const testSuffix = Date.now().toString();

  const company = await prisma.company.create({
    data: {
      name: `Pricing Test Company ${testSuffix}`,
      slug: `pricetest-${testSuffix}`,
    },
  });

  await prisma.pricingMethod.createMany({
    data: [
      { companyId: company.id, key: "per_hour", label: "Per Hour", unit: "hour", isActive: true },
      { companyId: company.id, key: "per_minute", label: "Per Minute", unit: "minute", isActive: true },
      { companyId: company.id, key: "per_acre", label: "Per Acre", unit: "acre", isActive: true },
      { companyId: company.id, key: "per_job", label: "Per Job / Fixed", unit: "job", isActive: true },
    ],
  });

  const ownerRole = await prisma.role.findFirstOrThrow({ where: { systemKey: "owner" } });

  const ownerUser = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: ownerRole.id,
      fullName: "Pricing Test Owner",
      email: `owner_${testSuffix}@example.com`,
      passwordHash: "dummy",
    },
    include: { role: true },
  });

  const authUser: AuthenticatedUser = {
    id: ownerUser.id,
    companyId: company.id,
    roleId: ownerUser.roleId,
    isOwner: true,
    permissions: ["operations.view", "booking.create", "job.update_status"],
  };

  // Create test master data
  const village = await prisma.village.create({
    data: { companyId: company.id, name: `Pricing Village ${testSuffix}` },
  });

  const customer = await customerService.create(company.id, {
    name: `Pricing Farmer ${testSuffix}`,
    villageId: village.id,
  });

  const machineType = await prisma.machineType.create({
    data: { companyId: company.id, name: "Pricing Harvester" },
  });

  const machine = await machineService.create(company.id, {
    machineTypeId: machineType.id,
    registrationNumber: `PRICING-${testSuffix}`,
  });

  const emp = await employeeService.create(company.id, {
    name: "Pricing Driver",
    compensationType: "HOURLY",
    hourlyRate: 250,
  });
  const driver = await driverService.create(company.id, { employeeId: emp.id });

  const pricingMethods = await prisma.pricingMethod.findMany({
    where: { companyId: company.id },
  });

  const pmHour = pricingMethods.find((p) => p.key === "per_hour")!;
  const pmMinute = pricingMethods.find((p) => p.key === "per_minute")!;
  const pmAcre = pricingMethods.find((p) => p.key === "per_acre")!;
  const pmJob = pricingMethods.find((p) => p.key === "per_job")!;

  // TEST 1: Per Hour (2.5 hrs × ₹500/hr = ₹1250)
  console.log("\n[TEST 1] Pricing Method 1: PER HOUR (2.5 hrs × ₹500/hr)...");
  const calc1 = calculateAmount({ unit: "hour", rate: 500, quantity: 2.5 });
  if (calc1 !== 1250) throw new Error(`Expected 1250, got ${calc1}`);

  const job1 = await jobService.createManualEntryJob(company.id, ownerUser.id, authUser, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: driver.id,
    scheduledDate: new Date(),
    pricingMethodId: pmHour.id,
    rate: 500,
    startTime: new Date(Date.now() - 3.5 * 3600 * 1000),
    endTime: new Date(Date.now() - 1 * 3600 * 1000), // 2.5 hrs
    notes: "Per Hour pricing test",
  });

  if (!job1.invoice || Number(job1.invoice.totalAmount) !== 1250) {
    throw new Error(`Expected Per Hour invoice amount 1250, got ${job1.invoice?.totalAmount}`);
  }
  console.log(" Per Hour pricing method verified: ₹" + job1.invoice.totalAmount);

  // TEST 2: Per Minute (90 mins × ₹10/min = ₹900)
  console.log("\n[TEST 2] Pricing Method 2: PER MINUTE (90 mins × ₹10/min)...");
  const calc2 = calculateAmount({ unit: "minute", rate: 10, quantity: 90 });
  if (calc2 !== 900) throw new Error(`Expected 900, got ${calc2}`);

  const job2 = await jobService.createManualEntryJob(company.id, ownerUser.id, authUser, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: driver.id,
    scheduledDate: new Date(),
    pricingMethodId: pmMinute.id,
    rate: 10,
    startTime: new Date(Date.now() - 2.5 * 3600 * 1000),
    endTime: new Date(Date.now() - 1 * 3600 * 1000), // 1.5 hrs = 90 mins
    notes: "Per Minute pricing test",
  });

  if (!job2.invoice || Number(job2.invoice.totalAmount) !== 900) {
    throw new Error(`Expected Per Minute invoice amount 900, got ${job2.invoice?.totalAmount}`);
  }
  console.log(" Per Minute pricing method verified: ₹" + job2.invoice.totalAmount);

  // TEST 3: Per Acre (4.0 acres × ₹600/acre = ₹2400)
  console.log("\n[TEST 3] Pricing Method 3: PER ACRE (4 acres × ₹600/acre)...");
  const calc3 = calculateAmount({ unit: "acre", rate: 600, quantity: 4.0 });
  if (calc3 !== 2400) throw new Error(`Expected 2400, got ${calc3}`);

  const job3 = await jobService.createManualEntryJob(company.id, ownerUser.id, authUser, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: driver.id,
    scheduledDate: new Date(),
    pricingMethodId: pmAcre.id,
    rate: 600,
    startTime: new Date(Date.now() - 4 * 3600 * 1000),
    endTime: new Date(Date.now() - 1 * 3600 * 1000),
    completedAcres: 4.0,
    notes: "Per Acre pricing test",
  });

  if (!job3.invoice || Number(job3.invoice.totalAmount) !== 2400) {
    throw new Error(`Expected Per Acre invoice amount 2400, got ${job3.invoice?.totalAmount}`);
  }
  console.log(" Per Acre pricing method verified: ₹" + job3.invoice.totalAmount);

  // TEST 4: Per Job / Fixed Rate (Fixed ₹5000)
  console.log("\n[TEST 4] Pricing Method 4: PER JOB / FIXED (Fixed ₹5000)...");
  const calc4 = calculateAmount({ unit: null, rate: 5000, quantity: null });
  if (calc4 !== 5000) throw new Error(`Expected 5000, got ${calc4}`);

  const job4 = await jobService.createManualEntryJob(company.id, ownerUser.id, authUser, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: driver.id,
    scheduledDate: new Date(),
    pricingMethodId: pmJob.id,
    rate: 5000,
    startTime: new Date(Date.now() - 3 * 3600 * 1000),
    endTime: new Date(Date.now() - 1 * 3600 * 1000),
    notes: "Fixed Per Job pricing test",
  });

  if (!job4.invoice || Number(job4.invoice.totalAmount) !== 5000) {
    throw new Error(`Expected Per Job invoice amount 5000, got ${job4.invoice?.totalAmount}`);
  }
  console.log(" Per Job / Fixed Rate pricing method verified: ₹" + job4.invoice.totalAmount);

  // Cleanup test company data
  await prisma.payment.deleteMany({ where: { companyId: company.id } });
  await prisma.invoice.deleteMany({ where: { companyId: company.id } });
  await prisma.jobStatusLog.deleteMany({ where: { companyId: company.id } });
  await prisma.job.deleteMany({ where: { companyId: company.id } });
  await prisma.booking.deleteMany({ where: { companyId: company.id } });
  await prisma.machine.deleteMany({ where: { companyId: company.id } });
  await prisma.driver.deleteMany({ where: { companyId: company.id } });
  await prisma.employee.deleteMany({ where: { companyId: company.id } });
  await prisma.customer.deleteMany({ where: { companyId: company.id } });
  await prisma.village.deleteMany({ where: { companyId: company.id } });
  await prisma.machineType.deleteMany({ where: { companyId: company.id } });
  await prisma.pricingMethod.deleteMany({ where: { companyId: company.id } });
  await prisma.user.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });

  console.log("\n==================================================");
  console.log(" ALL FOUR PRICING METHODS VERIFIED SUCCESSFULLY!");
  console.log("==================================================");
}

runPricingTests()
  .catch((err) => {
    console.error("Pricing Test Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
