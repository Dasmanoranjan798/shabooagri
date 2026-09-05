import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";

export interface DriverCompensationSummary {
  driverId: string;
  driverName: string;
  roleTitle: string | null;
  compensationType: "HOURLY" | "PER_MINUTE" | "MONTHLY" | "YEARLY";
  hourlyRate: number | null;
  perMinuteRate: number | null;
  monthlySalary: number | null;
  yearlySalary: number | null;
  totalCompletedJobs: number;
  totalWorkedHours: number;
  totalWorkedMinutes: number;
  calculatedEarnings: number;
  explanation: string;
}

export async function getDriverCompensationSummary(
  companyId: string,
  driverId: string,
): Promise<DriverCompensationSummary> {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: { employee: true },
  });

  if (!driver) {
    throw new AppError(404, "Driver not found");
  }

  // Attribute worked time from the authoritative WORK-SESSION history, never
  // from the job's current driverId — otherwise reassigning a driver mid-job
  // would misattribute the whole job to whoever finished it (Part 13). Each
  // completed job's authoritative actualHours (the existing, unchanged
  // calculation) is split across its sessions PROPORTIONALLY to per-driver
  // session time, so the per-driver hours always reconcile to the job total
  // and single-driver jobs are unchanged. Jobs with no sessions (MANUAL
  // after-work entries and pre-feature legacy jobs) fall back to the current
  // driverId — the only signal available, and correct since those cannot be
  // reassigned.
  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      OR: [{ driverId }, { workSessions: { some: { driverId } } }],
    },
    select: {
      driverId: true,
      actualHours: true,
      workSessions: { where: { endedAt: { not: null } }, select: { driverId: true, durationSec: true } },
    },
  });

  let totalWorkedHours = 0;
  let totalCompletedJobs = 0;
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    let attributed: number;
    if (totalSec > 0) {
      const driverSec = j.workSessions
        .filter((w) => w.driverId === driverId)
        .reduce((s, w) => s + (w.durationSec ?? 0), 0);
      attributed = jobHours * (driverSec / totalSec);
    } else {
      attributed = j.driverId === driverId ? jobHours : 0;
    }
    if (attributed > 0 || j.driverId === driverId) totalCompletedJobs += 1;
    totalWorkedHours += attributed;
  }

  const emp = driver.employee;
  const compType = emp.compensationType;
  const hourlyRate = emp.hourlyRate ? Number(emp.hourlyRate) : null;
  const perMinuteRate = emp.perMinuteRate ? Number(emp.perMinuteRate) : null;
  const monthlySalary = emp.monthlySalary ? Number(emp.monthlySalary) : null;
  const yearlySalary = emp.yearlySalary ? Number(emp.yearlySalary) : null;

  const roundedHours = Math.round(totalWorkedHours * 100) / 100;
  // Minutes derive from the same canonical worked-hours value so the two
  // never disagree; hourly pay uses hours, per-minute pay uses minutes.
  const roundedMinutes = Math.round(totalWorkedHours * 60 * 100) / 100;

  let calculatedEarnings = 0;
  let explanation = "";

  if (compType === "HOURLY") {
    const rate = hourlyRate ?? 0;
    calculatedEarnings = Math.round(roundedHours * rate * 100) / 100;
    explanation = `${roundedHours} worked hours × ₹${rate}/hr`;
  } else if (compType === "PER_MINUTE") {
    const rate = perMinuteRate ?? 0;
    calculatedEarnings = Math.round(roundedMinutes * rate * 100) / 100;
    explanation = `${roundedMinutes} worked minutes × ₹${rate}/min`;
  } else if (compType === "MONTHLY") {
    calculatedEarnings = monthlySalary ?? 0;
    explanation = `Fixed monthly salary: ₹${calculatedEarnings} (Job hours recorded: ${roundedHours} hrs)`;
  } else if (compType === "YEARLY") {
    calculatedEarnings = yearlySalary ?? 0;
    explanation = `Fixed annual salary: ₹${calculatedEarnings} (Job hours recorded: ${roundedHours} hrs)`;
  }

  return {
    driverId,
    driverName: emp.name,
    roleTitle: emp.roleTitle,
    compensationType: compType,
    hourlyRate,
    perMinuteRate,
    monthlySalary,
    yearlySalary,
    totalCompletedJobs,
    totalWorkedHours: roundedHours,
    totalWorkedMinutes: roundedMinutes,
    calculatedEarnings,
    explanation,
  };
}
