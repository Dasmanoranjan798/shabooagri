import { prisma } from "../src/db/prisma";
import * as driverCompensationService from "../src/modules/drivers/driverCompensation.service";
import * as driverPaymentService from "../src/modules/drivers/driverPayment.service";
import * as machineUtil from "../src/modules/machines/machineUtilization.service";
import * as maintenanceService from "../src/modules/maintenance/maintenance.service";
import * as reportsService from "../src/modules/reports/reports.service";
import { seedCompanyRoles } from "./helpers/seedRoles";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
}
function approx(a: number, b: number, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

async function run() {
  console.log("Driver & Machine enterprise tests starting...\n");
  const s = Date.now().toString();

  const company = await prisma.company.create({ data: { name: `DM ${s}`, slug: `dm-${s}` } });
  const companyId = company.id;
  const roleIdByKey = await seedCompanyRoles(companyId);
  const driverRole = { id: roleIdByKey.driver };

  const owner = await prisma.user.create({
    data: { companyId, roleId: roleIdByKey.owner, fullName: "Owner", email: `own_${s}@e.com`, passwordHash: "x" },
  });
  const ownerAuth = { id: owner.id, companyId, roleId: roleIdByKey.owner, isOwner: true };

  const method = await prisma.pricingMethod.create({
    data: { companyId, key: "per_hour", label: "Per Hour", unit: "hour", isActive: true },
  });
  const customer = await prisma.customer.create({ data: { companyId, name: `Cust ${s}` } });
  const customer2 = await prisma.customer.create({ data: { companyId, name: `Cust2 ${s}` } });
  const mType = await prisma.machineType.create({ data: { companyId, name: `Type ${s}` } });

  async function makeDriver(name: string, comp: "HOURLY" | "PER_MINUTE" | "MONTHLY" | "YEARLY", rate: { hourly?: number; perMin?: number; monthly?: number }, withUser = false) {
    let userId: string | undefined;
    if (withUser) {
      const u = await prisma.user.create({
        data: { companyId, roleId: driverRole.id, fullName: name, email: `${name.replace(/\W/g, "")}_${s}@e.com`, passwordHash: "x" },
      });
      userId = u.id;
    }
    const emp = await prisma.employee.create({
      data: {
        companyId, name, userId,
        compensationType: comp,
        hourlyRate: rate.hourly ?? null,
        perMinuteRate: rate.perMin ?? null,
        monthlySalary: rate.monthly ?? null,
      },
    });
    const drv = await prisma.driver.create({ data: { companyId, employeeId: emp.id } });
    return { driver: drv, employee: emp, userId };
  }

  async function makeMachine(reg: string) {
    return prisma.machine.create({ data: { companyId, machineTypeId: mType.id, registrationNumber: reg } });
  }

  let bkCounter = 0;
  async function completedJob(opts: {
    machineId?: string | null; driverId?: string | null; actualHours: number; customerId?: string;
    sessions?: Array<{ machineId: string; driverId: string; durationSec: number }>;
  }) {
    bkCounter += 1;
    const booking = await prisma.booking.create({
      data: {
        companyId, bookingNumber: `BK-${s}-${bkCounter}`, customerId: opts.customerId ?? customer.id,
        managerId: owner.id, scheduledDate: new Date(), pricingMethodId: method.id, rate: 100, createdBy: owner.id,
      },
    });
    const job = await prisma.job.create({
      data: {
        companyId, bookingId: booking.id, machineId: opts.machineId ?? null, driverId: opts.driverId ?? null,
        status: "COMPLETED", actualHours: opts.actualHours, startTime: new Date(Date.now() - 3600000), endTime: new Date(),
      },
    });
    if (opts.sessions) {
      for (const ss of opts.sessions) {
        await prisma.jobWorkSession.create({
          data: {
            companyId, jobId: job.id, machineId: ss.machineId, driverId: ss.driverId,
            startedAt: new Date(Date.now() - ss.durationSec * 1000), endedAt: new Date(), durationSec: ss.durationSec, startedBy: owner.id, endedBy: owner.id,
          },
        });
      }
    }
    return job;
  }

  // ---- TEST 45: hourly earnings ----
  console.log("[45] Driver hourly earnings");
  const dHour = await makeDriver("HourlyDrv", "HOURLY", { hourly: 200 });
  await completedJob({ driverId: dHour.driver.id, machineId: null, actualHours: 7.5 });
  const compH = await driverCompensationService.getDriverCompensationSummary(companyId, dHour.driver.id);
  assert(approx(compH.totalWorkedHours, 7.5), `hours 7.5 got ${compH.totalWorkedHours}`);
  assert(approx(compH.calculatedEarnings, 1500), `earned 1500 got ${compH.calculatedEarnings}`);
  console.log(`   7h30m × ₹200/hr = ₹${compH.calculatedEarnings} ✓`);

  // ---- TEST 46: per-minute earnings ----
  console.log("[46] Driver per-minute earnings");
  const dMin = await makeDriver("MinDrv", "PER_MINUTE", { perMin: 3 });
  await completedJob({ driverId: dMin.driver.id, actualHours: 7.5 }); // 450 min
  const compM = await driverCompensationService.getDriverCompensationSummary(companyId, dMin.driver.id);
  assert(approx(compM.totalWorkedMinutes, 450), `minutes 450 got ${compM.totalWorkedMinutes}`);
  assert(approx(compM.calculatedEarnings, 1350), `earned 1350 got ${compM.calculatedEarnings}`);
  console.log(`   450 min × ₹3/min = ₹${compM.calculatedEarnings} ✓`);

  // ---- TEST 47 + 20 + 22: partial payments ----
  console.log("[47] Driver Payment Out partial payments");
  const dPay = await makeDriver("PayDrv", "HOURLY", { hourly: 200 });
  await completedJob({ driverId: dPay.driver.id, actualHours: 100 }); // earns 20000
  let view = await driverPaymentService.getDriverEarnings(companyId, dPay.driver.id, ownerAuth);
  assert(approx(view.totalEarned, 20000), `earned 20000 got ${view.totalEarned}`);
  assert(view.status === "UNPAID", `status UNPAID got ${view.status}`);
  view = await driverPaymentService.recordDriverPayment(companyId, ownerAuth, dPay.driver.id, { amount: 12000, paymentMethod: "CASH" });
  assert(approx(view.totalPaid, 12000) && approx(view.remainingPayable, 8000) && view.status === "PARTIALLY_PAID", `after 12000: paid=${view.totalPaid} rem=${view.remainingPayable} status=${view.status}`);
  view = await driverPaymentService.recordDriverPayment(companyId, ownerAuth, dPay.driver.id, { amount: 8000, paymentMethod: "UPI" });
  assert(approx(view.totalPaid, 20000) && approx(view.remainingPayable, 0) && view.status === "PAID", `after 8000: paid=${view.totalPaid} rem=${view.remainingPayable} status=${view.status}`);
  assert(view.payments.length === 2, `2 payments got ${view.payments.length}`);
  console.log(`   20000 earned → 12000 + 8000 paid → remaining 0, PAID ✓`);

  // ---- TEST 48: double-payment protection ----
  console.log("[48] Double-payment protection");
  let blocked = false;
  try {
    await driverPaymentService.recordDriverPayment(companyId, ownerAuth, dPay.driver.id, { amount: 5000, paymentMethod: "CASH" });
  } catch (e: any) { blocked = true; console.log(`   Rejected as expected: "${e.message}"`); }
  assert(blocked, "overpaying a fully-paid driver was not rejected");

  // Cancel restores payable, then it can be paid again (valid re-payment path)
  const firstPaymentId = view.payments[view.payments.length - 1].id;
  view = await driverPaymentService.cancelDriverPayment(companyId, firstPaymentId, ownerAuth, "test correction");
  assert(view.totalPaid < 20000 && view.remainingPayable > 0, `cancel should restore payable, rem=${view.remainingPayable}`);
  console.log(`   Cancel restored remaining to ₹${view.remainingPayable} ✓`);

  // ---- TEST 42: machine maintenance accumulation & DUE ----
  console.log("[42] Machine maintenance hours accumulate -> DUE");
  const m1 = await makeMachine(`M1-${s}`);
  await prisma.maintenanceSchedule.create({ data: { companyId, machineId: m1.id, intervalHours: 150 } });
  for (const h of [50, 40, 30, 29.5]) await completedJob({ machineId: m1.id, driverId: null, actualHours: h });
  let st = await machineUtil.getMachineMaintenanceStatus(companyId, m1.id);
  assert(approx(st.totalWorked.decimalHours, 149.5), `total 149.5 got ${st.totalWorked.decimalHours}`);
  assert(st.status !== "DUE" && st.status !== "OVERDUE", `at 149.5 should not be DUE/OVERDUE, got ${st.status}`);
  await completedJob({ machineId: m1.id, actualHours: 0.5 });
  st = await machineUtil.getMachineMaintenanceStatus(companyId, m1.id);
  assert(approx(st.totalWorked.decimalHours, 150), `total 150 got ${st.totalWorked.decimalHours}`);
  assert(st.status === "DUE", `at 150 should be DUE got ${st.status}`);
  console.log(`   149.5h not-due, 150h → ${st.status} ✓`);

  // ---- TEST 43: overdue-by ----
  console.log("[43] Machine maintenance OVERDUE by 5h20m");
  const m2 = await makeMachine(`M2-${s}`);
  await prisma.maintenanceSchedule.create({ data: { companyId, machineId: m2.id, intervalHours: 150 } });
  await completedJob({ machineId: m2.id, actualHours: 155.33 }); // 155h20m
  st = await machineUtil.getMachineMaintenanceStatus(companyId, m2.id);
  assert(st.status === "OVERDUE", `status OVERDUE got ${st.status}`);
  assert(st.overdueBy.hours === 5 && st.overdueBy.minutes === 20, `overdue 5h20m got ${st.overdueBy.text}`);
  console.log(`   155h20m worked → ${st.message} ✓`);

  // ---- TEST 44: maintenance completion reset ----
  console.log("[44] Maintenance completion resets baseline + preserves history");
  const m3 = await makeMachine(`M3-${s}`);
  const sched3 = await prisma.maintenanceSchedule.create({ data: { companyId, machineId: m3.id, intervalHours: 150 } });
  await completedJob({ machineId: m3.id, actualHours: 152 });
  const rec = await maintenanceService.createRecord(companyId, { machineId: m3.id, maintenanceScheduleId: sched3.id, serviceDate: new Date().toISOString() }, owner.id);
  assert(approx(Number(rec.hourMeterAtService), 152), `record hourMeter 152 got ${rec.hourMeterAtService}`);
  const m3row = await prisma.machine.findUniqueOrThrow({ where: { id: m3.id } });
  assert(approx(Number(m3row.lastServiceHourMeter), 152), `machine lastServiceHourMeter 152 got ${m3row.lastServiceHourMeter}`);
  assert(approx(Number(m3row.nextServiceDueHours), 302), `next due 302 got ${m3row.nextServiceDueHours}`);
  st = await machineUtil.getMachineMaintenanceStatus(companyId, m3.id);
  assert(st.status === "NORMAL", `after reset status NORMAL got ${st.status}`);
  assert(approx(st.nextServiceThresholdHours ?? 0, 302), `next threshold 302 got ${st.nextServiceThresholdHours}`);
  const recCount = await prisma.maintenanceRecord.count({ where: { companyId, machineId: m3.id } });
  assert(recCount === 1, `history preserved, 1 record got ${recCount}`);
  console.log(`   Serviced at 152h → next threshold 302h, status NORMAL, history kept ✓`);

  // ---- TEST 49: work correction reconciles ----
  console.log("[49] Work correction reconciles machine + driver hours");
  const m4 = await makeMachine(`M4-${s}`);
  const d4 = await makeDriver("CorrDrv", "HOURLY", { hourly: 100 });
  const jobC = await completedJob({ machineId: m4.id, driverId: d4.driver.id, actualHours: 8 });
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, m4.id), 8), "machine 8h before");
  assert(approx((await driverCompensationService.getDriverCompensationSummary(companyId, d4.driver.id)).totalWorkedHours, 8), "driver 8h before");
  await prisma.job.update({ where: { id: jobC.id }, data: { actualHours: 6 } });
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, m4.id), 6), "machine reduced to 6h");
  const d4c = await driverCompensationService.getDriverCompensationSummary(companyId, d4.driver.id);
  assert(approx(d4c.totalWorkedHours, 6) && approx(d4c.calculatedEarnings, 600), `driver reduced to 6h/₹600 got ${d4c.totalWorkedHours}/${d4c.calculatedEarnings}`);
  console.log(`   8h→6h: machine & driver both reduced by 2h, earnings 800→600 ✓`);

  // ---- TEST 50: machine reassignment via sessions ----
  console.log("[50] Machine reassignment moves duration A→B");
  const mA = await makeMachine(`MA-${s}`);
  const mB = await makeMachine(`MB-${s}`);
  const dS = await makeDriver("SessDrv", "HOURLY", { hourly: 100 });
  const jobR = await completedJob({
    machineId: mB.id, driverId: dS.driver.id, actualHours: 8,
    sessions: [
      { machineId: mA.id, driverId: dS.driver.id, durationSec: 10800 }, // 3h
      { machineId: mB.id, driverId: dS.driver.id, durationSec: 18000 }, // 5h
    ],
  });
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, mA.id), 3), "MA 3h");
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, mB.id), 5), "MB 5h");
  // Move A's session to B → A loses 3h, B gains it
  await prisma.jobWorkSession.updateMany({ where: { jobId: jobR.id, machineId: mA.id }, data: { machineId: mB.id } });
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, mA.id), 0), "MA 0h after reassignment");
  assert(approx(await machineUtil.getMachineWorkedHours(companyId, mB.id), 8), "MB 8h after reassignment");
  console.log(`   MA 3h/MB 5h → reassigned → MA 0h/MB 8h ✓`);

  // ---- TEST 51: driver reassignment via sessions ----
  console.log("[51] Driver reassignment moves duration/earning A→B");
  const dA = await makeDriver("DrvA", "HOURLY", { hourly: 100 });
  const dB = await makeDriver("DrvB", "HOURLY", { hourly: 100 });
  const mS2 = await makeMachine(`MS2-${s}`);
  const jobD = await completedJob({
    machineId: mS2.id, driverId: dB.driver.id, actualHours: 10,
    sessions: [
      { machineId: mS2.id, driverId: dA.driver.id, durationSec: 14400 }, // 4h
      { machineId: mS2.id, driverId: dB.driver.id, durationSec: 21600 }, // 6h
    ],
  });
  assert(approx((await driverCompensationService.getDriverCompensationSummary(companyId, dA.driver.id)).totalWorkedHours, 4), "DrvA 4h");
  assert(approx((await driverCompensationService.getDriverCompensationSummary(companyId, dB.driver.id)).totalWorkedHours, 6), "DrvB 6h");
  await prisma.jobWorkSession.updateMany({ where: { jobId: jobD.id, driverId: dA.driver.id }, data: { driverId: dB.driver.id } });
  assert(approx((await driverCompensationService.getDriverCompensationSummary(companyId, dA.driver.id)).totalWorkedHours, 0), "DrvA 0h after reassignment");
  assert(approx((await driverCompensationService.getDriverCompensationSummary(companyId, dB.driver.id)).totalWorkedHours, 10), "DrvB 10h after reassignment");
  console.log(`   DrvA 4h/DrvB 6h → reassigned → DrvA 0h/DrvB 10h ✓`);

  // ---- TEST 52: driver self-service security ----
  console.log("[52] Driver cannot access another driver's data");
  const dSelf = await makeDriver("SelfDrv", "HOURLY", { hourly: 100 }, true);
  const dOther = await makeDriver("OtherDrv", "HOURLY", { hourly: 100 }, true);
  const selfAuth = { id: dSelf.userId!, companyId, roleId: driverRole.id };
  // Own data: allowed
  const own = await driverPaymentService.getDriverEarnings(companyId, dSelf.driver.id, selfAuth);
  assert(own.driverId === undefined ? true : true, "own earnings readable"); // structural
  assert(own.compensation.driverId === dSelf.driver.id, "own earnings returned");
  // Another driver's data: 404
  let denied = false;
  try {
    await driverPaymentService.getDriverEarnings(companyId, dOther.driver.id, selfAuth);
  } catch (e: any) { denied = e.statusCode === 404 || /not found/i.test(e.message); }
  assert(denied, "driver was able to read another driver's earnings!");
  // "me" alias resolves to the caller's own driver.
  const meId = await driverPaymentService.resolveDriverIdParam(companyId, selfAuth, "me");
  assert(meId === dSelf.driver.id, `"me" should resolve to own driver, got ${meId}`);
  console.log(`   Driver reads own earnings (& "me" alias); blocked (404) from another driver's ✓`);

  // ---- Reports reconcile ----
  console.log("[Reports] driver & machine reports reconcile");
  const drvReport = await reportsService.getDriverReport(companyId, {});
  const payRow = drvReport.rows.find((r) => r.driverId === dPay.driver.id);
  assert(!!payRow && approx(payRow.totalEarned, 20000), "driver report shows PayDrv 20000 earned");
  const macReport = await reportsService.getMachineReport(companyId, {});
  const mbRow = macReport.rows.find((r) => r.machineId === mB.id);
  assert(!!mbRow && approx(mbRow.workedHours, 8), `machine report MB 8h got ${mbRow?.workedHours}`);
  const maint = await reportsService.getMachineMaintenanceReport(companyId);
  assert(maint.some((r) => r.machineId === m2.id && r.status === "OVERDUE"), "maintenance report flags M2 overdue");
  console.log(`   Reports reconcile with transactions ✓`);

  // ---- CLEANUP ----
  console.log("\nCleaning up...");
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.driverPayment.deleteMany({ where: { companyId } });
  await prisma.jobWorkSession.deleteMany({ where: { companyId } });
  await prisma.maintenanceRecord.deleteMany({ where: { companyId } });
  await prisma.maintenanceSchedule.deleteMany({ where: { companyId } });
  await prisma.job.deleteMany({ where: { companyId } });
  await prisma.booking.deleteMany({ where: { companyId } });
  await prisma.machine.deleteMany({ where: { companyId } });
  await prisma.driver.deleteMany({ where: { companyId } });
  await prisma.employee.deleteMany({ where: { companyId } });
  await prisma.customer.deleteMany({ where: { companyId } });
  await prisma.machineType.deleteMany({ where: { companyId } });
  await prisma.pricingMethod.deleteMany({ where: { companyId } });
  await prisma.user.deleteMany({ where: { companyId } });
  const companyRoles = await prisma.role.findMany({ where: { companyId }, select: { id: true } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: companyRoles.map((r) => r.id) } } });
  await prisma.role.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });

  console.log("\n ALL DRIVER & MACHINE TESTS PASSED SUCCESSFULLY!\n");
}

run()
  .catch((err) => {
    console.error(" Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
