import { prisma } from "../src/db/prisma";
import * as customerService from "../src/modules/customers/customer.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as driverService from "../src/modules/drivers/driver.service";
import * as employeeService from "../src/modules/employees/employee.service";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as jobService from "../src/modules/jobs/job.service";
import * as paymentService from "../src/modules/payments/payment.service";
import * as maintenanceService from "../src/modules/maintenance/maintenance.service";
import * as rbacService from "../src/modules/rbac/rbac.service";

async function seedCompany(name: string, slug: string, prefix: string) {
  const company = await prisma.company.create({
    data: { name, slug, invoicePrefix: prefix },
  });

  const permissions = await prisma.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.key, p.id]));

  const systemRoles = [
    { systemKey: "owner", name: "Owner", perms: Array.from(permMap.keys()) },
    {
      systemKey: "manager",
      name: "Manager",
      perms: [
        "dashboard.view",
        "booking.create",
        "booking.edit",
        "machine.assign",
        "driver.assign",
        "job.update_status",
        "payment.receive",
        "report.generate",
        "user.manage",
        "village.manage",
        "machine_type.manage",
        "machine.manage",
        "employee.manage",
        "driver.manage",
        "customer.manage",
        "operations.view",
      ],
    },
    { systemKey: "driver", name: "Driver", perms: ["job.update_status"] },
    { systemKey: "farmer", name: "Farmer", perms: [] },
  ];

  for (const roleDef of systemRoles) {
    const role = await prisma.role.create({
      data: {
        companyId: company.id,
        systemKey: roleDef.systemKey,
        name: roleDef.name,
        isSystemRole: true,
      },
    });

    for (const pKey of roleDef.perms) {
      const pId = permMap.get(pKey);
      if (pId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: pId },
        });
      }
    }
  }

  const defaultPricingMethods = [
    { key: "per_hour", label: "Per Hour", unit: "hour" },
    { key: "per_minute", label: "Per Minute", unit: "minute" },
    { key: "per_acre", label: "Per Acre", unit: "acre" },
    { key: "per_job", label: "Per Job (Fixed)", unit: null },
    { key: "minimum_charge", label: "Minimum Charge", unit: null },
    { key: "custom", label: "Custom Rate", unit: null },
  ];

  for (const pm of defaultPricingMethods) {
    await prisma.pricingMethod.create({
      data: { companyId: company.id, key: pm.key, label: pm.label, unit: pm.unit },
    });
  }

  return company;
}

async function runSecurityAuditTests() {
  console.log("==================================================");
  console.log("STARTING PHASE 2 SECURITY & HARDENING AUDIT TESTS");
  console.log("==================================================\n");

  const timestamp = Date.now();

  const defaultPerms = [
    { key: "dashboard.view", description: "View dashboard metrics" },
    { key: "booking.create", description: "Create a booking" },
    { key: "booking.edit", description: "Edit a booking" },
    { key: "booking.delete", description: "Cancel/delete a booking" },
    { key: "machine.assign", description: "Assign a machine to a booking" },
    { key: "driver.assign", description: "Assign a driver to a booking" },
    { key: "job.update_status", description: "Record job execution progress" },
    { key: "payment.receive", description: "Record a payment against an invoice" },
    { key: "report.generate", description: "View/generate reports" },
    { key: "user.manage", description: "Create/edit/deactivate users" },
    { key: "settings.manage", description: "Change company settings" },
    { key: "data.export", description: "Export data" },
    { key: "village.manage", description: "Create/edit/delete villages" },
    { key: "machine_type.manage", description: "Create/edit/delete machine types" },
    { key: "machine.manage", description: "Create/edit/delete machines" },
    { key: "employee.manage", description: "Create/edit/delete employee records" },
    { key: "driver.manage", description: "Create/edit/delete driver profiles" },
    { key: "customer.manage", description: "Create/edit/delete customer records" },
    { key: "operations.view", description: "Browse operational lists" },
  ];

  for (const p of defaultPerms) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
  }

  console.log("[SETUP] Creating Company Alpha and Company Beta with seeded system roles...");

  const companyA = await seedCompany(`Alpha Farms ${timestamp}`, `alpha-${timestamp}`, "ALPHA-");
  const companyB = await seedCompany(`Beta Agri ${timestamp}`, `beta-${timestamp}`, "BETA-");

  const ownerRoleA = await prisma.role.findFirstOrThrow({ where: { companyId: companyA.id, systemKey: "owner" } });
  const managerRoleA = await prisma.role.findFirstOrThrow({ where: { companyId: companyA.id, systemKey: "manager" } });

  const ownerRoleB = await prisma.role.findFirstOrThrow({ where: { companyId: companyB.id, systemKey: "owner" } });
  const managerRoleB = await prisma.role.findFirstOrThrow({ where: { companyId: companyB.id, systemKey: "manager" } });

  const ownerUserA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      roleId: ownerRoleA.id,
      fullName: "Alpha Owner",
      email: `alpha.owner.${timestamp}@test.com`,
      passwordHash: "hash",
    },
  });

  const managerUserA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      roleId: managerRoleA.id,
      fullName: "Alpha Manager",
      email: `alpha.manager.${timestamp}@test.com`,
      passwordHash: "hash",
    },
  });

  const ownerUserB = await prisma.user.create({
    data: {
      companyId: companyB.id,
      roleId: ownerRoleB.id,
      fullName: "Beta Owner",
      email: `beta.owner.${timestamp}@test.com`,
      passwordHash: "hash",
    },
  });

  const managerUserB = await prisma.user.create({
    data: {
      companyId: companyB.id,
      roleId: managerRoleB.id,
      fullName: "Beta Manager",
      email: `beta.manager.${timestamp}@test.com`,
      passwordHash: "hash",
    },
  });

  const authOwnerA = { id: ownerUserA.id, companyId: companyA.id, roleId: ownerRoleA.id };
  const authOwnerB = { id: ownerUserB.id, companyId: companyB.id, roleId: ownerRoleB.id };

  const villageB = await prisma.village.create({
    data: { companyId: companyB.id, name: `Beta Village ${timestamp}` },
  });

  const machineTypeB = await prisma.machineType.create({
    data: { companyId: companyB.id, name: `Tractor B ${timestamp}` },
  });

  const pricingMethodB = await prisma.pricingMethod.findFirstOrThrow({
    where: { companyId: companyB.id, key: "per_hour" },
  });

  const customerB = await customerService.create(companyB.id, {
    name: "Customer Beta",
    phone: `99${timestamp.toString().slice(-8)}`,
    villageId: villageB.id,
  });

  const employeeB = await employeeService.create(companyB.id, {
    name: "Beta Employee",
    phone: `98${timestamp.toString().slice(-8)}`,
  });

  const driverB = await driverService.create(companyB.id, {
    employeeId: employeeB.id,
    licenseNumber: "LIC-BETA-123",
  });

  const machineB = await machineService.create(companyB.id, {
    registrationNumber: `KA-01-BETA-${timestamp.toString().slice(-4)}`,
    machineTypeId: machineTypeB.id,
    model: "John Deere B",
    assignedDriverId: driverB.id,
  });

  const bookingB = await bookingService.create(companyB.id, managerUserB.id, {
    customerId: customerB.id,
    villageId: villageB.id,
    machineId: machineB.id,
    driverId: driverB.id,
    scheduledDate: new Date("2026-08-10") as any,
    pricingMethodId: pricingMethodB.id,
    rate: 500,
    estimatedHours: 4,
  });

  await bookingService.updateStatus(companyB.id, bookingB.id, "ACCEPTED");
  await bookingService.updateStatus(companyB.id, bookingB.id, "ON_THE_WAY");
  const jobB = await prisma.job.findFirstOrThrow({ where: { companyId: companyB.id, bookingId: bookingB.id } });

  await jobService.start(companyB.id, jobB.id, authOwnerB, {});
  await jobService.complete(companyB.id, jobB.id, authOwnerB, { actualHours: 4 });
  const invoiceB = await prisma.invoice.findFirstOrThrow({ where: { companyId: companyB.id, bookingId: bookingB.id } });

  const scheduleB = await maintenanceService.createSchedule(companyB.id, {
    machineId: machineB.id,
    intervalHours: 100,
    description: "Oil filter change",
  });

  console.log(" Test data created successfully for Company Alpha and Company Beta.\n");

  // ==================================================
  // TEST 1: MULTI-TENANT BACKEND ISOLATION
  // ==================================================
  console.log("[TEST 1] Testing Backend Multi-Tenant Isolation (Cross-Company Access Controls)...");

  // 1a. Customers Isolation
  try {
    await customerService.getById(companyA.id, customerB.id);
    throw new Error("FAIL: Company A user was able to access Company B customer!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Customer READ isolation: PASSED (404 returned)");
    else throw err;
  }

  try {
    await customerService.update(companyA.id, customerB.id, { name: "Hacked Name" });
    throw new Error("FAIL: Company A user was able to update Company B customer!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Customer WRITE isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1b. Machines Isolation
  try {
    await machineService.getById(companyA.id, machineB.id);
    throw new Error("FAIL: Company A user accessed Company B machine!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Machine READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1c. Drivers & Employees Isolation
  try {
    await driverService.getById(companyA.id, driverB.id);
    throw new Error("FAIL: Company A user accessed Company B driver!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Driver READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1d. Bookings Isolation
  try {
    await bookingService.getById(companyA.id, bookingB.id, authOwnerA);
    throw new Error("FAIL: Company A user accessed Company B booking!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Booking READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1e. Jobs Isolation
  try {
    await jobService.getById(companyA.id, jobB.id, authOwnerA);
    throw new Error("FAIL: Company A user accessed Company B job!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Job READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1f. Invoices & Payments Isolation
  try {
    await paymentService.getInvoiceById(companyA.id, invoiceB.id, authOwnerA);
    throw new Error("FAIL: Company A user accessed Company B invoice!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Invoice READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1g. Maintenance Isolation
  try {
    await maintenanceService.getScheduleById(companyA.id, scheduleB.id);
    throw new Error("FAIL: Company A user accessed Company B maintenance schedule!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   Maintenance READ isolation: PASSED (404 returned)");
    else throw err;
  }

  // 1h. RBAC Roles Isolation
  try {
    await rbacService.getRoleById(companyA.id, ownerRoleB.id);
    throw new Error("FAIL: Company A user accessed Company B role!");
  } catch (err: any) {
    if (err.statusCode === 404) console.log("   RBAC Role READ isolation: PASSED (404 returned)");
    else throw err;
  }

  console.log(" ALL MULTI-TENANT ISOLATION TESTS PASSED!\n");

  // Custom role CRUD and terminology/white-label write-path tests removed —
  // that functionality is Phase 2 scope (§2, §6, §9, §10) and was pulled
  // out of Phase 1 during the saas/business cleanup. RBAC read-scoping
  // (TEST 1 above) and the read-only terminology/profile layer remain
  // covered.

  // ==================================================
  // CLEANUP SYNTHETIC TEST DATA
  // ==================================================
  console.log("[CLEANUP] Cleaning up test data...");

  await prisma.jobFuelEntry.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.payment.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.invoice.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.jobPhoto.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.jobStatusLog.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.job.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.bookingAttachment.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.booking.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.maintenanceRecord.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.maintenanceSchedule.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.machine.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.driver.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.employee.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.customer.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.village.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.machineType.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.pricingMethod.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.terminologySetting.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });

  await prisma.rolePermission.deleteMany({
    where: { role: { companyId: { in: [companyA.id, companyB.id] } } },
  });
  await prisma.user.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.role.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
  await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });

  console.log(" Cleanup complete.\n");
  console.log("==================================================");
  console.log(" ALL PHASE 2 SECURITY & HARDENING TESTS PASSED!");
  console.log("==================================================");
}

runSecurityAuditTests().catch((err) => {
  console.error(" PHASE 2 SECURITY TEST FAILED:", err);
  process.exit(1);
});
