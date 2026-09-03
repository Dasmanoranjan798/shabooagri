// Job Execution V2 — WORKING-only occupancy, PAUSE releases, RESUME re-checks,
// PAUSED reassignment + reasons + audit, work-session history & per-resource
// attribution, transportation charges, concurrency. Backend-authoritative;
// no client involved. Companion to test-job-resource-conflict.ts (START rules).
import { prisma } from "../src/db/prisma";
import * as customerService from "../src/modules/customers/customer.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as driverService from "../src/modules/drivers/driver.service";
import * as employeeService from "../src/modules/employees/employee.service";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as jobService from "../src/modules/jobs/job.service";
import * as jobReportService from "../src/modules/jobs/jobReport.service";
import * as driverCompensationService from "../src/modules/drivers/driverCompensation.service";
import * as paymentService from "../src/modules/payments/payment.service";
import * as transportTypeService from "../src/modules/transport-types/transportType.service";
import { pauseJobSchema, changeMachineSchema, changeDriverSchema } from "../src/modules/jobs/job.validators";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}
function approx(a: number, b: number, eps = 0.02) { return Math.abs(a - b) < eps; }

async function expectRejected(fn: () => Promise<unknown>, mustContain: string[] = []) {
  try { await fn(); return { rejected: false, message: "" }; }
  catch (e: any) {
    const msg = e?.message ?? String(e);
    const matched = mustContain.every((s) => msg.includes(s));
    return { rejected: true, message: msg, matched };
  }
}

async function run() {
  console.log("==================================================");
  console.log("JOB EXECUTION V2 — occupancy / pause-release / resume / reassignment / sessions / transport");
  console.log("==================================================");

  const company = await prisma.company.create({
    data: { name: "JobExecV2 Agri", slug: `jev2-${Date.now()}`, invoicePrefix: "JEV2" },
  });
  const permissions = await prisma.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.key, p.id]));
  const managerRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "manager", name: "Manager", isSystemRole: true },
  });
  const managerPerms = ["dashboard.view", "booking.create", "booking.edit", "machine.assign", "driver.assign", "job.update_status", "job.cancel", "operations.view", "report.generate"];
  for (const pKey of managerPerms) {
    const pId = permMap.get(pKey);
    if (pId) await prisma.rolePermission.create({ data: { roleId: managerRole.id, permissionId: pId } });
  }
  const managerUser = await prisma.user.create({
    data: { companyId: company.id, roleId: managerRole.id, fullName: "Manager", email: `mgr-${Date.now()}@t.com` },
  });
  const auth: AuthenticatedUser = { id: managerUser.id, companyId: company.id, roleId: managerRole.id, isOwner: false, permissions: managerPerms };

  const village = await prisma.village.create({ data: { companyId: company.id, name: `V-${Date.now()}` } });
  const customer = await customerService.create(company.id, { name: "Arabinda Giri", villageId: village.id });
  const machineType = await prisma.machineType.create({ data: { companyId: company.id, name: "Harvester" } });
  const rnd = () => Math.floor(Math.random() * 8999 + 1000);
  const mkMachine = (reg: string) => machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: reg });
  const mkDriver = async (name: string) => {
    const emp = await employeeService.create(company.id, { name, compensationType: "HOURLY", hourlyRate: 300 });
    return driverService.create(company.id, { employeeId: emp.id });
  };
  const perHour = await prisma.pricingMethod.findFirst({ where: { companyId: company.id, key: "per_hour" } })
    || await prisma.pricingMethod.create({ data: { companyId: company.id, key: "per_hour", label: "Per Hour", unit: "hour" } });

  async function makeJob(machineId: string, driverId: string) {
    const booking = await bookingService.create(company.id, managerUser.id, {
      customerId: customer.id, villageId: village.id, machineId, driverId,
      scheduledDate: new Date(), workDescription: "Harvesting", pricingMethodId: perHour.id, rate: 500, ignoreConflict: true,
    } as any);
    const list = await jobService.list(company.id, auth);
    const job = list.find((j) => j.bookingId === booking.id)!;
    return { booking, job };
  }

  // ============ REASON REQUIREMENTS (validator layer) =====================
  console.log("\n[Reasons] pause / machine-change / driver-change require a reason");
  assert(!pauseJobSchema.safeParse({}).success, "PAUSE rejects missing reason");
  assert(!pauseJobSchema.safeParse({ note: "   " }).success, "PAUSE rejects blank reason");
  assert(pauseJobSchema.safeParse({ note: "Customer requested pause" }).success, "PAUSE accepts a reason");
  assert(!changeMachineSchema.safeParse({ machineId: crypto.randomUUID() }).success, "MACHINE change rejects missing reason");
  assert(!changeDriverSchema.safeParse({ driverId: crypto.randomUUID() }).success, "DRIVER change rejects missing reason");
  // "Other requires explanation" is a client rule: whatever text arrives is stored.
  assert(pauseJobSchema.safeParse({ note: "Other: waiting for spare part" }).success, "PAUSE 'Other' free-text accepted");

  // ============ PAUSE releases; RESUME re-checks ==========================
  console.log("\n[Pause/Resume] PAUSE releases resources; RESUME re-checks availability");
  const mX = await mkMachine(`KA-05-AG-${rnd()}`);
  const dR = await mkDriver("Ranjan Das");
  const p1 = await makeJob(mX.id, dR.id);
  const startedP1 = await jobService.start(company.id, p1.job.id, auth, {});
  assert(startedP1.status === "WORKING", "P1 WORKING");
  await jobService.pause(company.id, startedP1.id, auth, { note: "Customer requested pause" });
  const p1paused = await jobService.getById(company.id, startedP1.id, auth);
  assert(p1paused.status === "PAUSED", "P1 PAUSED");

  // Another job takes the freed machine+driver.
  const p2 = await makeJob(mX.id, dR.id);
  const startedP2 = await jobService.start(company.id, p2.job.id, auth, {});
  assert(startedP2.status === "WORKING", "P2 starts on machine+driver freed by P1's pause");

  // RESUME P1 now must be REJECTED (resources busy on P2) — item 14/15/16.
  const rResume = await expectRejected(() => jobService.resume(company.id, startedP1.id, auth, { note: "back to work" }), [mX.registrationNumber, p2.booking.bookingNumber]);
  assert(rResume.rejected && (rResume as any).matched, "RESUME P1 rejected while resources busy (names P2)");
  const p1still = await jobService.getById(company.id, startedP1.id, auth);
  assert(p1still.status === "PAUSED", "P1 remains PAUSED after failed resume (no partial change)");

  // Free them, then RESUME succeeds.
  await jobService.pause(company.id, startedP2.id, auth, { note: "done for now" });
  const p1resumed = await jobService.resume(company.id, startedP1.id, auth, { note: "resource free again" });
  assert(p1resumed.status === "WORKING", "RESUME P1 succeeds once resources free");

  // ============ PAUSED reassignment + audit + history structure ===========
  console.log("\n[Reassign] Machine/Driver change only while PAUSED; audited; history preserved");
  const mY = await mkMachine(`KA-05-AG-${rnd()}`);
  const dS = await mkDriver("Suresh Das");
  // Reassign is rejected while WORKING.
  const rChangeWorking = await expectRejected(() => jobService.changeMachine(company.id, p1resumed.id, auth, { machineId: mY.id, reason: "x" }));
  assert(rChangeWorking.rejected && /PAUSED|WORKING/.test(rChangeWorking.message), "Machine change rejected while WORKING");

  await jobService.pause(company.id, p1resumed.id, auth, { note: "Machine issue" });
  const afterMachineChange = await jobService.changeMachine(company.id, p1resumed.id, auth, { machineId: mY.id, reason: "Machine breakdown" });
  assert(afterMachineChange.machineId === mY.id, "Machine changed X->Y while PAUSED");
  await jobService.resume(company.id, p1resumed.id, auth, { note: "resumed on new machine" });
  await jobService.pause(company.id, p1resumed.id, auth, { note: "Driver issue" });
  const afterDriverChange = await jobService.changeDriver(company.id, p1resumed.id, auth, { driverId: dS.id, reason: "Driver unavailable" });
  assert(afterDriverChange.driverId === dS.id, "Driver changed R->S while PAUSED");
  await jobService.resume(company.id, p1resumed.id, auth, { note: "resumed with new driver" });
  const finalP1 = await jobService.stop(company.id, p1resumed.id, auth, { endTime: new Date() });
  assert(finalP1!.status === "STOPPED", "P1 stopped after 3 working stretches");

  // Work-session structure — one session per WORKING interval, history NOT
  // overwritten. P1's life: start(X,R) · pause · resume(X,R) · pause ·
  // change→Y · resume(Y,R) · pause · change→S · resume(Y,S) · stop = 4
  // sessions. Each resume legitimately opens its own interval.
  const sessions = await jobService.listWorkSessions(company.id, startedP1.id, auth);
  assert(sessions.length === 4, `P1 has 4 work sessions, one per working interval (got ${sessions.length})`);
  assert(sessions[0].machineId === mX.id && sessions[0].driverId === dR.id, "Session 1 = Machine X + Driver Ranjan");
  assert(sessions[1].machineId === mX.id && sessions[1].driverId === dR.id, "Session 2 = Machine X + Driver Ranjan (pause/resume, no change)");
  assert(sessions[2].machineId === mY.id && sessions[2].driverId === dR.id, "Session 3 = Machine Y + Driver Ranjan (after machine change)");
  assert(sessions[3].machineId === mY.id && sessions[3].driverId === dS.id, "Session 4 = Machine Y + Driver Suresh (after driver change)");
  assert(sessions.every((s) => s.endedAt !== null), "All P1 sessions closed");
  // History preserved: the old Machine X and old Driver Ranjan still appear in
  // sessions even though the job's CURRENT assignment is now Machine Y + Suresh.
  assert(sessions.some((s) => s.machineId === mX.id) && finalP1!.machineId === mY.id, "Old Machine X retained in history despite current = Y");
  assert(sessions.some((s) => s.driverId === dR.id) && finalP1!.driverId === dS.id, "Old Driver Ranjan retained in history despite current = Suresh");

  // Assignment-change audit: 2 rows with reasons, user, old->new.
  const changes = await jobService.listAssignmentChanges(company.id, startedP1.id, auth);
  assert(changes.length === 2, `2 assignment-change audit rows (got ${changes.length})`);
  const mc = changes.find((c) => c.field === "MACHINE")!;
  const dc = changes.find((c) => c.field === "DRIVER")!;
  assert(mc.oldMachineId === mX.id && mc.newMachineId === mY.id && mc.reason === "Machine breakdown" && mc.changedBy === managerUser.id, "MACHINE change audited (old/new/reason/user)");
  assert(dc.oldDriverId === dR.id && dc.newDriverId === dS.id && dc.reason === "Driver unavailable", "DRIVER change audited (old/new/reason)");

  // ============ Work-session totals & per-resource attribution ============
  console.log("\n[Reporting] per-Driver / per-Machine attribution from sessions (deterministic)");
  // Real flow above created correctly-structured sessions but with ~0s live
  // durations; to test attribution math deterministically we seed a fresh
  // COMPLETED job's sessions with known durations (Part 13/14 example):
  // Ranjan 1h30m on X + 1h30m on Y = 3h; Suresh 1h on Y = 1h; total 4h.
  const mAtt1 = await mkMachine(`KA-05-AG-${rnd()}`);
  const mAtt2 = await mkMachine(`KA-05-AG-${rnd()}`);
  const dAttR = await mkDriver("Attr Ranjan");
  const dAttS = await mkDriver("Attr Suresh");
  const attManual = await jobService.createManualEntryJob(company.id, managerUser.id, auth, {
    customerId: customer.id, villageId: village.id, machineId: mAtt1.id, driverId: dAttR.id,
    scheduledDate: new Date(), pricingMethodId: perHour.id, rate: 500,
    startTime: new Date(Date.now() - 4 * 3600 * 1000), endTime: new Date(), // 4h
  });
  assert(approx(Number(attManual.actualHours), 4), "Attribution job actualHours = 4");
  const base = Date.now() - 4 * 3600 * 1000;
  const seed = async (machineId: string, driverId: string, offMin: number, durSec: number) =>
    prisma.jobWorkSession.create({ data: {
      companyId: company.id, jobId: attManual.id, machineId, driverId,
      startedAt: new Date(base + offMin * 60000), endedAt: new Date(base + offMin * 60000 + durSec * 1000),
      durationSec: durSec, startedBy: managerUser.id, endedBy: managerUser.id,
    } });
  await seed(mAtt1.id, dAttR.id, 0, 5400);    // Ranjan/X 1h30m
  await seed(mAtt2.id, dAttR.id, 90, 5400);   // Ranjan/Y 1h30m
  await seed(mAtt2.id, dAttS.id, 180, 3600);  // Suresh/Y 1h

  const ranjanSummary = await driverCompensationService.getDriverCompensationSummary(company.id, dAttR.id);
  const sureshSummary = await driverCompensationService.getDriverCompensationSummary(company.id, dAttS.id);
  assert(approx(ranjanSummary.totalWorkedHours, 3), `Ranjan attributed 3h (got ${ranjanSummary.totalWorkedHours})`);
  assert(approx(sureshSummary.totalWorkedHours, 1), `Suresh attributed 1h (got ${sureshSummary.totalWorkedHours})`);
  assert(approx(ranjanSummary.calculatedEarnings, 900), `Ranjan pay 3h×₹300=₹900 (got ${ranjanSummary.calculatedEarnings})`);
  assert(approx(sureshSummary.calculatedEarnings, 300), `Suresh pay 1h×₹300=₹300 (got ${sureshSummary.calculatedEarnings})`);

  const machine1Hours = await jobReportService.getMachineWorkedHours(company.id, mAtt1.id);
  const machine2Hours = await jobReportService.getMachineWorkedHours(company.id, mAtt2.id);
  assert(approx(machine1Hours, 1.5), `Machine X worked 1h30m (got ${machine1Hours})`);
  assert(approx(machine2Hours, 2.5), `Machine Y worked 2h30m (got ${machine2Hours})`);

  // Changing the CURRENT driver does not rewrite historical attribution:
  // dAttS never becomes the job's current driver yet still gets its 1h.
  assert(sureshSummary.totalWorkedHours > 0, "Non-current driver still credited from history (item 32)");

  const summary = await jobReportService.getJobWorkSummary(company.id, attManual.id, auth);
  assert(summary.sessionCount === 3, "Work summary reports 3 sessions");
  assert(summary.totalWorkedSeconds === 14400, "Total worked seconds = 4h (pause excluded)");
  assert(approx(summary.perDriver.find((d) => d.driverId === dAttR.id)!.hours, 3), "Work summary: Ranjan 3h from sessions");
  assert(approx(summary.perDriver.find((d) => d.driverId === dAttS.id)!.hours, 1), "Work summary: Suresh 1h from sessions");
  assert(approx(summary.perMachine.find((m) => m.machineId === mAtt2.id)!.hours, 2.5), "Work summary: Machine Y 2h30m from sessions");

  // ============ Transportation (structured, separate, optional) ===========
  console.log("\n[Transport] structured charge, trips×rate, separate invoice line, optional");
  // Default transport types seeded lazily.
  const types = await transportTypeService.list(company.id);
  assert(types.some((t) => t.name === "Tractor"), "Default transport types seeded (Tractor present)");
  // Custom configurable type.
  const custom = await transportTypeService.create(company.id, "Bullock Cart");
  assert(custom.name === "Bullock Cart", "Custom transport type created");

  // A job to attach transport to (work = 2h × ₹500 = ₹1000).
  const mT = await mkMachine(`KA-05-AG-${rnd()}`);
  const dT = await mkDriver("Transport Driver");
  const t1 = await makeJob(mT.id, dT.id);
  const startedT1 = await jobService.start(company.id, t1.job.id, auth, { startTime: new Date(Date.now() - 2 * 3600 * 1000) });
  const stoppedT1 = await jobService.stop(company.id, startedT1.id, auth, { endTime: new Date() });
  const workHours = Number(stoppedT1!.actualHours);
  const tractor = types.find((t) => t.name === "Tractor")!;
  const charge = await jobService.addTransportCharge(company.id, startedT1.id, auth, { transportTypeId: tractor.id, trips: 2, ratePerTrip: 1000 } as any);
  assert(Number(charge.totalAmount) === 2000, "Transport total = 2 trips × ₹1000 = ₹2000 (server-computed)");
  assert(charge.transportTypeName === "Tractor", "Transport type name snapshotted");
  // Transport did not touch the harvesting timer.
  const afterCharge = await jobService.getById(company.id, startedT1.id, auth);
  assert(Number(afterCharge.actualHours) === workHours, "Transport did NOT change actualHours");

  // Submit -> invoice = work + transport, structurally separated.
  await jobService.submit(company.id, startedT1.id, auth, {});
  const invoices = await paymentService.listInvoices(company.id, auth);
  const inv = invoices.find((i) => i.bookingId === t1.booking.id)!;
  const expectedWork = Math.round(workHours * 500 * 100) / 100;
  assert(approx(Number(inv.subtotalAmount), expectedWork), `Invoice work subtotal = ₹${expectedWork} (got ${inv.subtotalAmount})`);
  assert(Number(inv.transportAmount) === 2000, "Invoice transportAmount = ₹2000 (separate line)");
  assert(approx(Number(inv.totalAmount), expectedWork + 2000), `Invoice total = work + transport (got ${inv.totalAmount})`);

  // Optional: a job with no transport -> transportAmount 0, total = work only.
  const mT2 = await mkMachine(`KA-05-AG-${rnd()}`);
  const dT2 = await mkDriver("No Transport Driver");
  const t2 = await makeJob(mT2.id, dT2.id);
  const startedT2 = await jobService.start(company.id, t2.job.id, auth, { startTime: new Date(Date.now() - 3600 * 1000) });
  await jobService.stop(company.id, startedT2.id, auth, { endTime: new Date(), actualHours: 1 });
  await jobService.submit(company.id, startedT2.id, auth, {});
  const inv2 = (await paymentService.listInvoices(company.id, auth)).find((i) => i.bookingId === t2.booking.id)!;
  assert(Number(inv2.transportAmount) === 0, "No-transport job: transportAmount = 0 (optional)");
  assert(Number(inv2.totalAmount) === 500, "No-transport job: total = work only (₹500)");

  // Can't add transport to a COMPLETED job.
  const rLateTransport = await expectRejected(() => jobService.addTransportCharge(company.id, startedT1.id, auth, { transportTypeId: tractor.id, trips: 1, ratePerTrip: 100 } as any));
  assert(rLateTransport.rejected, "Transport rejected on COMPLETED job");

  // ============ Concurrency: RESUME race ==================================
  console.log("\n[Concurrency] two PAUSED jobs racing to RESUME onto same freed resource");
  const mC = await mkMachine(`KA-05-AG-${rnd()}`);
  const dC = await mkDriver("Concur Driver");
  const c1 = await makeJob(mC.id, dC.id);
  const sc1 = await jobService.start(company.id, c1.job.id, auth, {});
  await jobService.pause(company.id, sc1.id, auth, { note: "pause 1" });
  const c2 = await makeJob(mC.id, dC.id);
  const sc2 = await jobService.start(company.id, c2.job.id, auth, {});
  await jobService.pause(company.id, sc2.id, auth, { note: "pause 2" });
  // Both PAUSED, resources free. Race two RESUMEs.
  const results = await Promise.allSettled([
    jobService.resume(company.id, sc1.id, auth, { note: "race 1" }),
    jobService.resume(company.id, sc2.id, auth, { note: "race 2" }),
  ]);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  assert(ok === 1, `Exactly one RESUME won the race (got ${ok} fulfilled)`);
  const working = await prisma.job.count({ where: { machineId: mC.id, status: "WORKING" } });
  assert(working === 1, "Machine C has exactly ONE WORKING job after the resume race");

  await prisma.company.delete({ where: { id: company.id } }).catch(() => {});

  console.log("\n==================================================");
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log("==================================================");
  if (failed > 0) process.exit(1);
}

run().then(() => process.exit(0)).catch((e) => { console.error("TEST CRASHED:", e); process.exit(1); });
