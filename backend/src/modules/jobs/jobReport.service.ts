import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import type { AuthenticatedUser } from "../auth/auth.types";
import * as jobRepository from "./job.repository";
import * as jobWorkSessionRepository from "./jobWorkSession.repository";
import * as jobTransportChargeRepository from "./jobTransportCharge.repository";
import { resolveCallerScope } from "../../shared/access/callerScope";

// Machine utilisation from authoritative WORK-SESSION history, split
// proportionally to each machine's real session time within every completed
// job (mirrors driverCompensation's attribution). Never reads job.machineId,
// so a machine swapped mid-job is credited only for the intervals it ran
// (Part 14). Returns worked hours.
export async function getMachineWorkedHours(companyId: string, machineId: string): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      OR: [{ machineId }, { workSessions: { some: { machineId } } }],
    },
    select: {
      machineId: true,
      actualHours: true,
      workSessions: { where: { endedAt: { not: null } }, select: { machineId: true, durationSec: true } },
    },
  });

  let hours = 0;
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    if (totalSec > 0) {
      const machineSec = j.workSessions
        .filter((w) => w.machineId === machineId)
        .reduce((s, w) => s + (w.durationSec ?? 0), 0);
      hours += jobHours * (machineSec / totalSec);
    } else if (j.machineId === machineId) {
      hours += jobHours;
    }
  }
  return Math.round(hours * 100) / 100;
}

export interface JobWorkSummary {
  jobId: string;
  bookingNumber: string;
  status: string;
  actualHours: number;
  totalWorkedSeconds: number;
  sessionCount: number;
  perDriver: Array<{ driverId: string; driverName: string; seconds: number; hours: number }>;
  perMachine: Array<{ machineId: string; registrationNumber: string; seconds: number; hours: number }>;
  transportTotal: number;
  transportChargeCount: number;
}

// Everything a customer-facing summary / detailed report needs, from history
// rather than current fields (Parts 15, 30). Work charges/pricing themselves
// are unchanged and continue to come from the invoice/pricing engine.
export async function getJobWorkSummary(companyId: string, jobId: string, user: AuthenticatedUser): Promise<JobWorkSummary> {
  const job = await jobRepository.findByIdScopedWithRelations(companyId, jobId);
  if (!job) throw new AppError(404, "Job not found");

  const scope = await resolveCallerScope(companyId, user);
  const isVisible =
    scope.kind === "company" ||
    (scope.kind === "driver" && job.driverId === scope.driverId) ||
    (scope.kind === "customer" && job.booking.customerId === scope.customerId);
  if (!isVisible) throw new AppError(404, "Job not found");

  const sessions = await jobWorkSessionRepository.listForJob(companyId, jobId);
  const transport = await jobTransportChargeRepository.listForJob(companyId, jobId);

  const driverMap = new Map<string, { driverId: string; driverName: string; seconds: number }>();
  const machineMap = new Map<string, { machineId: string; registrationNumber: string; seconds: number }>();
  let totalWorkedSeconds = 0;
  for (const s of sessions) {
    const sec = s.durationSec ?? 0;
    totalWorkedSeconds += sec;
    const dName = s.driver?.employee?.name ?? "Unknown";
    const d = driverMap.get(s.driverId) ?? { driverId: s.driverId, driverName: dName, seconds: 0 };
    d.seconds += sec;
    driverMap.set(s.driverId, d);
    const mReg = s.machine?.registrationNumber ?? "Unknown";
    const m = machineMap.get(s.machineId) ?? { machineId: s.machineId, registrationNumber: mReg, seconds: 0 };
    m.seconds += sec;
    machineMap.set(s.machineId, m);
  }

  const toHours = (sec: number) => Math.round((sec / 3600) * 100) / 100;
  const transportTotal = transport.reduce((sum, t) => sum + Number(t.totalAmount), 0);

  return {
    jobId: job.id,
    bookingNumber: job.booking.bookingNumber,
    status: job.status,
    actualHours: job.actualHours ? Number(job.actualHours) : 0,
    totalWorkedSeconds,
    sessionCount: sessions.length,
    perDriver: [...driverMap.values()].map((d) => ({ ...d, hours: toHours(d.seconds) })),
    perMachine: [...machineMap.values()].map((m) => ({ ...m, hours: toHours(m.seconds) })),
    transportTotal: Math.round(transportTotal * 100) / 100,
    transportChargeCount: transport.length,
  };
}

export async function getDriverWorkedSeconds(companyId: string, driverId: string): Promise<number> {
  return jobWorkSessionRepository.sumDurationSecByDriver(companyId, driverId, "COMPLETED");
}
