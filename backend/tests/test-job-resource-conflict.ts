// Job Start resource-conflict rule: a physical Machine and a Driver may each
// be on only ONE active (WORKING/PAUSED) job at a time. Future bookings for a
// busy resource stay allowed; the line is drawn at Start, enforced in the
// operational backend inside a row-locking transaction. See job.service.ts:start().
import { prisma } from "../src/db/prisma";
import * as customerService from "../src/modules/customers/customer.service";
import * as machineService from "../src/modules/machines/machine.service";
import * as driverService from "../src/modules/drivers/driver.service";
import * as employeeService from "../src/modules/employees/employee.service";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as jobService from "../src/modules/jobs/job.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

async function expectStartRejected(companyId: string, jobId: string, auth: AuthenticatedUser, mustContain: string[]) {
  try {
    await jobService.start(companyId, jobId, auth, {});
    return { rejected: false, message: "" };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const ok = mustContain.every((s) => msg.includes(s));
    if (!ok) console.error(`    (message was: ${JSON.stringify(msg)})`);
    return { rejected: true, message: msg, matched: ok };
  }
}

async function jobForBooking(companyId: string, bookingId: string, auth: AuthenticatedUser) {
  const list = await jobService.list(companyId, auth);
  const job = list.find((j) => j.bookingId === bookingId);
  if (!job) throw new Error("Job not initialised for booking " + bookingId);
  return job;
}

async function run() {
  console.log("==================================================");
  console.log("JOB START — RESOURCE CONFLICT (Machine/Driver single-active-job) TESTS");
  console.log("==================================================");

  const company = await prisma.company.create({
    data: { name: "Resource Conflict Agri", slug: `rc-${Date.now()}`, invoicePrefix: "RC" },
  });

  const permissions = await prisma.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.key, p.id]));
  const managerRole = await prisma.role.create({
    data: { companyId: company.id, systemKey: "manager", name: "Manager", isSystemRole: true },
  });
  const managerPerms = [
    "dashboard.view", "booking.create", "booking.edit", "machine.assign",
    "driver.assign", "job.update_status", "operations.view",
  ];
  for (const pKey of managerPerms) {
    const pId = permMap.get(pKey);
    if (pId) await prisma.rolePermission.create({ data: { roleId: managerRole.id, permissionId: pId } });
  }
  const managerUser = await prisma.user.create({
    data: { companyId: company.id, roleId: managerRole.id, fullName: "Manager", email: `mgr-${Date.now()}@t.com` },
  });
  const auth: AuthenticatedUser = {
    id: managerUser.id, companyId: company.id, roleId: managerRole.id, isOwner: false, permissions: managerPerms,
  };

  const village = await prisma.village.create({ data: { companyId: company.id, name: `V-${Date.now()}` } });
  const customer = await customerService.create(company.id, { name: "Customer One", villageId: village.id });
  const machineType = await prisma.machineType.create({ data: { companyId: company.id, name: "Tractor" } });

  const rnd = () => Math.floor(Math.random() * 8999 + 1000);
  const machineX = await machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: `KA-05-AG-${rnd()}` });
  const machineY = await machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: `KA-05-AG-${rnd()}` });

  const empRanjan = await employeeService.create(company.id, { name: "Ranjan Das", compensationType: "HOURLY", hourlyRate: 300 });
  const driverRanjan = await driverService.create(company.id, { employeeId: empRanjan.id });
  const empSuresh = await employeeService.create(company.id, { name: "Suresh Kumar", compensationType: "HOURLY", hourlyRate: 300 });
  const driverSuresh = await driverService.create(company.id, { employeeId: empSuresh.id });

  const perHour = await prisma.pricingMethod.findFirst({ where: { companyId: company.id, key: "per_hour" } })
    || await prisma.pricingMethod.create({ data: { companyId: company.id, key: "per_hour", label: "Per Hour", unit: "hour" } });

  // Helper to create a booking (ignoreConflict lets us book a busy resource,
  // which the business rule explicitly permits) and return its job card.
  // ignoreConflict defaults true: the booking-level same-day guard is a
  // separate rule we deliberately override here so we can exercise the
  // Start-time resource rule. That the booking is still created is exactly
  // the "future booking on a busy resource is allowed" behaviour (TEST 6/7).
  async function makeJob(machineId: string, driverId: string, _ignoreConflict = true) {
    const booking = await bookingService.create(company.id, managerUser.id, {
      customerId: customer.id, villageId: village.id, machineId, driverId,
      scheduledDate: new Date(), workDescription: "Field work", pricingMethodId: perHour.id, rate: 500,
      ignoreConflict: true,
    } as any);
    const job = await jobForBooking(company.id, booking.id, auth);
    return { booking, job };
  }

  // -- TEST 1: Machine + Driver both free -> Start succeeds ------------------
  console.log("\n[1] Machine + Driver free -> Start succeeds");
  const a = await makeJob(machineX.id, driverRanjan.id);
  const startedA = await jobService.start(company.id, a.job.id, auth, {});
  assert(startedA.status === "WORKING", "Job A becomes WORKING");

  // -- TEST 6/7: future booking on busy resource CAN be created & stays READY -
  console.log("\n[6/7] Future booking on busy Machine+Driver is created and stays NOT_STARTED");
  const b = await makeJob(machineX.id, driverRanjan.id, /*ignoreConflict*/ true);
  assert(!!b.booking?.id, "Second booking created despite resource busy");
  assert(b.job.status === "NOT_STARTED", "Job B remains NOT_STARTED (did not auto-become WORKING)");

  // -- TEST 4: Machine AND Driver both busy on the SAME other job -> rejected -
  console.log("\n[4] Machine+Driver both busy on same job -> Start rejected (combined message)");
  const r4 = await expectStartRejected(company.id, b.job.id, auth, [
    "Cannot start this job", machineX.registrationNumber, "Ranjan Das", "and Driver", a.booking.bookingNumber,
  ]);
  assert(r4.rejected && (r4 as any).matched, "Job B rejected, names Machine + Driver + BK on one line");
  const bAfter = await jobService.getById(company.id, b.job.id, auth);
  assert(bAfter.status === "NOT_STARTED", "Job B still NOT_STARTED after rejection (no partial success)");

  // -- TEST 2: Only Machine busy -> rejected ---------------------------------
  console.log("\n[2] Only Machine busy -> Start rejected");
  const c = await makeJob(machineX.id, driverSuresh.id, true); // machineX busy (on A), Suresh free
  const r2 = await expectStartRejected(company.id, c.job.id, auth, [
    "Cannot start this job", "Machine", machineX.registrationNumber, a.booking.bookingNumber,
  ]);
  assert(r2.rejected && (r2 as any).matched, "Rejected naming the busy Machine");
  assert(!r2.message.includes("Driver Suresh"), "Free driver not mentioned");

  // -- TEST 3: Only Driver busy -> rejected ----------------------------------
  console.log("\n[3] Only Driver busy -> Start rejected");
  const d = await makeJob(machineY.id, driverRanjan.id, true); // machineY free, Ranjan busy (on A)
  const r3 = await expectStartRejected(company.id, d.job.id, auth, [
    "Cannot start this job", "Driver", "Ranjan Das", a.booking.bookingNumber,
  ]);
  assert(r3.rejected && (r3 as any).matched, "Rejected naming the busy Driver");

  // -- TEST 5: Machine busy on Job A, Driver busy on Job E -> both identified -
  console.log("\n[5] Machine on job A, Driver on a different job -> both conflicts identified");
  // Start a job using machineY + driverSuresh so Suresh is busy on a DIFFERENT job.
  const e = await makeJob(machineY.id, driverSuresh.id);
  const startedE = await jobService.start(company.id, e.job.id, auth, {});
  assert(startedE.status === "WORKING", "Job E (machineY+Suresh) becomes WORKING");
  // Now a new job wanting machineX (busy on A) + driverSuresh (busy on E).
  const f = await makeJob(machineX.id, driverSuresh.id, true);
  const r5 = await expectStartRejected(company.id, f.job.id, auth, [
    machineX.registrationNumber, a.booking.bookingNumber, "Suresh Kumar", e.booking.bookingNumber,
  ]);
  assert(r5.rejected && (r5 as any).matched, "Both conflicting bookings named (Machine->A, Driver->E)");
  assert(r5.message.includes("\n"), "Two-conflict message is multi-line");

  // -- TEST 9 (CORRECTED): PAUSED RELEASES Machine + Driver ------------------
  // ShabooAgri rule: only WORKING occupies. Pausing frees the resource so
  // another booking can start on it meanwhile. Isolated pair so it doesn't
  // disturb the A/E state used below.
  console.log("\n[9] PAUSED releases Machine + Driver (another job can start on them)");
  const machineP = await machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: `KA-05-AG-${rnd()}` });
  const empPause = await employeeService.create(company.id, { name: "Pause Driver", compensationType: "HOURLY", hourlyRate: 300 });
  const driverPause = await driverService.create(company.id, { employeeId: empPause.id });
  const j = await makeJob(machineP.id, driverPause.id);
  const startedJ = await jobService.start(company.id, j.job.id, auth, {});
  assert(startedJ.status === "WORKING", "Job J WORKING on machineP+driverPause");
  await jobService.pause(company.id, startedJ.id, auth, { note: "Customer requested pause" });
  const k = await makeJob(machineP.id, driverPause.id, true);
  const startedK = await jobService.start(company.id, k.job.id, auth, {});
  assert(startedK.status === "WORKING", "Job K starts on the SAME machineP+driverPause released by J's PAUSE");
  await jobService.cancel(company.id, startedK.id, auth, "cleanup");

  // -- TEST 8 & 10: COMPLETED/CANCELLED release the resources ----------------
  console.log("\n[8/10] Completing/Cancelling active job releases Machine + Driver; next booking can START");
  // Cancel E to free machineY + Suresh, then Stop+Submit A to free machineX + Ranjan.
  await jobService.cancel(company.id, startedE.id, auth, "test release");
  await jobService.stop(company.id, startedA.id, auth, { endTime: new Date(), actualHours: 1 });
  await jobService.submit(company.id, startedA.id, auth, {});
  const aDone = await jobService.getById(company.id, startedA.id, auth);
  assert(aDone.status === "COMPLETED", "Job A COMPLETED");
  // Now B (machineX + Ranjan) should be startable — both released.
  const startedB = await jobService.start(company.id, b.job.id, auth, {});
  assert(startedB.status === "WORKING", "Job B now starts once A is COMPLETED (resources released)");
  // And C (machineX + Suresh) must now be blocked by B on the machine.
  const r10 = await expectStartRejected(company.id, c.job.id, auth, [machineX.registrationNumber, b.booking.bookingNumber]);
  assert(r10.rejected, "C blocked by newly-active B on the same Machine");

  // -- TEST 11: two simultaneous Starts on same Machine+Driver: only one wins -
  console.log("\n[11] Concurrent Start on same Machine+Driver -> exactly one succeeds");
  // Fresh machine + driver + two competing jobs.
  const machineZ = await machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: `KA-05-AG-${rnd()}` });
  const empGita = await employeeService.create(company.id, { name: "Gita Rao", compensationType: "HOURLY", hourlyRate: 300 });
  const driverGita = await driverService.create(company.id, { employeeId: empGita.id });
  const j1 = await makeJob(machineZ.id, driverGita.id);
  const j2 = await makeJob(machineZ.id, driverGita.id, true);
  const results = await Promise.allSettled([
    jobService.start(company.id, j1.job.id, auth, {}),
    jobService.start(company.id, j2.job.id, auth, {}),
  ]);
  const fulfilled = results.filter((r) => r.status === "fulfilled").length;
  const rejected = results.filter((r) => r.status === "rejected").length;
  assert(fulfilled === 1 && rejected === 1, `Exactly one Start won (fulfilled=${fulfilled}, rejected=${rejected})`);
  const workingCount = await prisma.job.count({ where: { machineId: machineZ.id, status: { in: ["WORKING", "PAUSED"] } } });
  assert(workingCount === 1, "Machine Z has exactly ONE active job (never two)");
  const driverWorking = await prisma.job.count({ where: { driverId: driverGita.id, status: { in: ["WORKING", "PAUSED"] } } });
  assert(driverWorking === 1, "Driver Gita has exactly ONE active job (never two)");

  // -- TEST 12: stale/authoritative — check reads live jobs table -----------
  console.log("\n[12] Backend reads authoritative jobs table (stale client state cannot bypass)");
  // j2 lost the race above and is still NOT_STARTED; a retry must still be
  // rejected because the backend re-derives occupancy from the DB, not any
  // client-supplied state.
  const jLoser = (await Promise.all([j1, j2].map(async (j) => jobService.getById(company.id, j.job.id, auth))))
    .find((j) => j.status === "NOT_STARTED");
  assert(!!jLoser, "One competitor remained NOT_STARTED");
  const r12 = await expectStartRejected(company.id, jLoser!.id, auth, [machineZ.registrationNumber]);
  assert(r12.rejected, "Losing job re-rejected from authoritative DB state on retry");

  // -- TEST 13: pricing/duration calc unchanged ------------------------------
  console.log("\n[13] Pricing/duration calc unchanged (start->stop actualHours formula intact)");
  const machineW = await machineService.create(company.id, { machineTypeId: machineType.id, registrationNumber: `KA-05-AG-${rnd()}` });
  const empRavi = await employeeService.create(company.id, { name: "Ravi", compensationType: "HOURLY", hourlyRate: 300 });
  const driverRavi = await driverService.create(company.id, { employeeId: empRavi.id });
  const g = await makeJob(machineW.id, driverRavi.id);
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
  const startedG = await jobService.start(company.id, g.job.id, auth, { startTime: twoHoursAgo });
  assert(startedG.status === "WORKING", "Job G started with backdated startTime");
  const stoppedG = await jobService.stop(company.id, g.job.id, auth, { endTime: new Date() });
  const hours = Number(stoppedG!.actualHours);
  assert(Math.abs(hours - 2) < 0.05, `actualHours ~= 2.0 from unchanged formula (got ${hours})`);

  // Cleanup
  await prisma.company.delete({ where: { id: company.id } }).catch(() => {});

  console.log("\n==================================================");
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log("==================================================");
  if (failed > 0) process.exit(1);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("TEST CRASHED:", e);
    process.exit(1);
  });
