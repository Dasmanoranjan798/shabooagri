// One-off verification for the dependency-locked deletion feature
// (2026-08-17) — exercises the real service functions against the real
// database in a disposable, isolated test company (same pattern as
// tests/test-payments.ts), asserting each of the 5 rules actually behaves
// as specified. Not wired into `npm test` — this is a one-time manual
// verification, not a permanent regression suite.
//
// Usage: npx tsx scripts/smokeTestDependencyLock.ts
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../src/shared/seedData";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as jobService from "../src/modules/jobs/job.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as paymentService from "../src/modules/payments/payment.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

let passCount = 0;
let failCount = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passCount++;
    console.log(`  PASS: ${label}`);
  } else {
    failCount++;
    console.error(`  FAIL: ${label}`, detail ?? "");
  }
}

async function expectRejects(label: string, fn: () => Promise<unknown>, messageIncludes: string) {
  try {
    await fn();
    check(label, false, "did not throw");
  } catch (err: any) {
    check(label, typeof err.message === "string" && err.message.includes(messageIncludes), err.message);
  }
}

async function main() {
  const suffix = Date.now().toString();
  const company = await prisma.company.create({
    data: { name: `Dep Lock Smoke Test ${suffix}`, slug: `deplock-smoke-${suffix}` },
  });
  const companyId = company.id;

  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) => prisma.permission.upsert({ where: { key: p.key }, update: {}, create: p })),
  );
  const permissionIdByKey = new Map(permissionRecords.map((p) => [p.key, p.id]));

  const roleIdByKey: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.create({
      data: { companyId, systemKey: roleDef.systemKey, name: roleDef.name, isSystemRole: true },
    });
    roleIdByKey[roleDef.systemKey] = role.id;
    for (const key of ROLE_PERMISSIONS[roleDef.systemKey]) {
      const permissionId = permissionIdByKey.get(key);
      if (permissionId) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId } });
    }
  }

  const ownerUser = await prisma.user.create({
    data: {
      companyId,
      roleId: roleIdByKey.owner,
      fullName: "Smoke Test Owner",
      email: `owner_${suffix}@example.com`,
      passwordHash: await bcrypt.hash("Password123!", 10),
    },
  });
  const owner: AuthenticatedUser = { id: ownerUser.id, companyId, roleId: ownerUser.roleId } as AuthenticatedUser;

  const pricingMethod = await prisma.pricingMethod.create({
    data: { companyId, key: "per_hour", label: "Per Hour", unit: "hour" },
  });
  const village = await prisma.village.create({ data: { companyId, name: "Smoke Village" } });
  const customer = await prisma.customer.create({
    data: { companyId, name: "Smoke Customer", villageId: village.id },
  });
  const machineType = await prisma.machineType.create({ data: { companyId, name: "Tractor" } });
  const machine = await prisma.machine.create({
    data: { companyId, machineTypeId: machineType.id, registrationNumber: `REG-${suffix}` },
  });
  const employee = await prisma.employee.create({ data: { companyId, name: "Smoke Driver Employee" } });
  const driver = await prisma.driver.create({ data: { companyId, employeeId: employee.id } });

  console.log("\n=== Rule 4: master-data delete blocked by booking references ===");
  const booking = await bookingService.create(companyId, ownerUser.id, {
    customerId: customer.id,
    villageId: village.id,
    machineId: machine.id,
    driverId: driver.id,
    managerId: ownerUser.id,
    scheduledDate: new Date(),
    pricingMethodId: pricingMethod.id,
    rate: 500,
  } as any);
  await expectRejects(
    "machine.service.remove() blocked while a booking references it",
    () => machineService.remove(companyId, machine.id),
    "booking",
  );

  console.log("\n=== Rule 3: booking delete/cancel blocked by linked Job ===");
  await bookingService.updateStatus(companyId, booking.id, "ACCEPTED");
  await bookingService.updateStatus(companyId, booking.id, "ON_THE_WAY");
  const job = await jobService.findLinkedForBooking(companyId, booking.id);
  check("Job auto-created when booking went ON_THE_WAY", !!job, job);

  await expectRejects(
    "booking.service.remove() blocked while an unvoided job is linked",
    () => bookingService.remove(companyId, booking.id),
    "job exists",
  );
  await expectRejects(
    "booking.service.updateStatus(CANCELLED) blocked while an active job is linked",
    () => bookingService.updateStatus(companyId, booking.id, "CANCELLED"),
    "active job",
  );

  console.log("\n=== Rule 1 & 2: payment void + job cancel guard ===");
  await jobService.start(companyId, job!.id, owner, {});
  await jobService.complete(companyId, job!.id, owner, { actualHours: 2 });
  const invoice = await paymentService.getInvoiceById(
    companyId,
    (await prisma.invoice.findFirstOrThrow({ where: { companyId, bookingId: booking.id } })).id,
    owner,
  );
  const { payment } = await paymentService.receivePayment(companyId, invoice.id, owner, {
    amount: 100,
    paymentMethod: "CASH",
  } as any);

  const completedJob = await prisma.job.findUniqueOrThrow({ where: { id: job!.id } });
  check("Job status is COMPLETED before cancel attempt", completedJob.status === "COMPLETED");
  await expectRejects(
    "job.service.cancel() blocked while a non-voided payment is linked (COMPLETED job)",
    () => jobService.cancel(companyId, job!.id, owner, "test cancel"),
    "payment",
  );

  const voidedPayment = await paymentService.voidPayment(companyId, payment.id, owner, "smoke test void");
  check("Payment.voided is true after void", (voidedPayment as any).voided === true);
  check("Payment.voidReason recorded", (voidedPayment as any).voidReason === "smoke test void");

  const voidedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  check("Invoice paidAmount reverted after payment void", Number(voidedInvoice.paidAmount) === 0);

  const revenueAfterVoid = await paymentService.getDashboardRevenueInWindow(
    companyId,
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  check("Voided payment excluded from revenue aggregation", revenueAfterVoid === 0, revenueAfterVoid);

  console.log("\n=== Rule 5: manager role lacks the new Owner-only permissions ===");
  const managerRole = await prisma.role.findFirstOrThrow({ where: { id: roleIdByKey.manager } });
  const managerPermissionKeys = new Set(
    (
      await prisma.rolePermission.findMany({
        where: { roleId: managerRole.id },
        include: { permission: true },
      })
    ).map((rp) => rp.permission.key),
  );
  for (const key of ["payment.void", "village.delete", "machine.delete", "employee.delete", "driver.delete", "customer.delete", "job.cancel"]) {
    check(`Manager role does NOT have "${key}"`, !managerPermissionKeys.has(key));
  }
  const ownerPermissionKeys = new Set(
    (
      await prisma.rolePermission.findMany({
        where: { roleId: roleIdByKey.owner },
        include: { permission: true },
      })
    ).map((rp) => rp.permission.key),
  );
  for (const key of ["payment.void", "village.delete", "machine.delete", "employee.delete", "driver.delete", "customer.delete", "job.cancel"]) {
    check(`Owner role has "${key}"`, ownerPermissionKeys.has(key));
  }

  console.log("\n=== Full unwind path: void unblocks job cancel, which unblocks booking cancel ===");
  const cancelledJob = await jobService.cancel(companyId, job!.id, owner, "smoke test cancel after void");
  check("Job cancel succeeds once its payment is voided", (cancelledJob as any).status === "CANCELLED");

  const cancelledBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
  check("Booking auto-cancelled alongside its job", cancelledBooking.status === "CANCELLED");

  await expectRejects(
    "booking.service.remove() still blocked — the (now cancelled) Job row still exists (DB RESTRICT)",
    () => bookingService.remove(companyId, booking.id),
    "kept for history",
  );

  console.log(`\n${passCount} passed, ${failCount} failed.`);
  console.log(`Test company left in place for inspection: ${company.slug} (${companyId})`);
  if (failCount > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
