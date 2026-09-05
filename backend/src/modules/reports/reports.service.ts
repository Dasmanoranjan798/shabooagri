import { prisma } from "../../db/prisma";
import type { Prisma } from "@prisma/client";
import * as driverCompensationService from "../drivers/driverCompensation.service";
import * as driverPaymentRepo from "../drivers/driverPayment.repository";
import * as machineUtilizationService from "../machines/machineUtilization.service";
import { toDuration } from "../machines/machineUtilization.service";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ReportFilters {
  from?: string;
  to?: string;
  driverId?: string;
  machineId?: string;
  customerId?: string;
}

// Completed jobs matching the report filters. All machine/driver report
// metrics come from these authoritative work rows, so the reports always
// reconcile with the underlying transactions. Cancelled jobs are excluded
// (status COMPLETED only). Date range is on completion time (endTime).
function completedJobWhere(companyId: string, f: ReportFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { companyId, status: "COMPLETED" };
  if (f.from || f.to) {
    where.endTime = {};
    if (f.from) (where.endTime as Prisma.DateTimeFilter).gte = new Date(f.from);
    if (f.to) (where.endTime as Prisma.DateTimeFilter).lte = new Date(f.to);
  }
  if (f.machineId) where.machineId = f.machineId;
  if (f.customerId) where.booking = { customerId: f.customerId };
  return where;
}

// ---------------------------------------------------------------------------
// Driver-wise work + earnings report
// Work columns (jobs/hours/minutes/periodEarned) are scoped to the filter;
// financial position (totalEarned/totalPaid/balance) is all-time — the actual
// money owed today, which a date window would misrepresent.
// ---------------------------------------------------------------------------
export interface DriverReportRow {
  driverId: string;
  driverName: string;
  compensationType: string;
  hourlyRate: number | null;
  perMinuteRate: number | null;
  jobs: number;
  workedHours: number;
  workedMinutes: number;
  workedText: string;
  periodEarned: number | null; // null for fixed-salary drivers (not period-attributable)
  totalEarned: number;
  totalPaid: number;
  balance: number;
}

export async function getDriverReport(companyId: string, f: ReportFilters): Promise<{ period: { from: string | null; to: string | null }; rows: DriverReportRow[] }> {
  const jobs = await prisma.job.findMany({
    where: completedJobWhere(companyId, f),
    select: {
      id: true,
      driverId: true,
      actualHours: true,
      workSessions: { where: { endedAt: { not: null } }, select: { driverId: true, durationSec: true } },
    },
  });

  // Attribute worked hours to each driver (proportional session split, same
  // rule as driverCompensation) over the filtered job set.
  const perDriver = new Map<string, { hours: number; jobs: Set<string> }>();
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    if (totalSec > 0) {
      const byDriver = new Map<string, number>();
      for (const w of j.workSessions) {
        byDriver.set(w.driverId, (byDriver.get(w.driverId) ?? 0) + (w.durationSec ?? 0));
      }
      for (const [drvId, sec] of byDriver) {
        if (f.driverId && drvId !== f.driverId) continue;
        const entry = perDriver.get(drvId) ?? { hours: 0, jobs: new Set() };
        entry.hours += jobHours * (sec / totalSec);
        entry.jobs.add(j.id);
        perDriver.set(drvId, entry);
      }
    } else if (j.driverId && (!f.driverId || j.driverId === f.driverId)) {
      const entry = perDriver.get(j.driverId) ?? { hours: 0, jobs: new Set() };
      entry.hours += jobHours;
      entry.jobs.add(j.id);
      perDriver.set(j.driverId, entry);
    }
  }

  // Ensure an explicitly-filtered driver appears even with zero work.
  if (f.driverId && !perDriver.has(f.driverId)) {
    perDriver.set(f.driverId, { hours: 0, jobs: new Set() });
  }

  const rows: DriverReportRow[] = [];
  for (const [driverId, agg] of perDriver) {
    const comp = await driverCompensationService.getDriverCompensationSummary(companyId, driverId);
    const totalPaid = round2(await driverPaymentRepo.sumNonCancelledForDriver(companyId, driverId));
    const totalEarned = round2(comp.calculatedEarnings);
    const hours = round2(agg.hours);
    const minutes = round2(agg.hours * 60);

    let periodEarned: number | null = null;
    if (comp.compensationType === "HOURLY") periodEarned = round2(hours * (comp.hourlyRate ?? 0));
    else if (comp.compensationType === "PER_MINUTE") periodEarned = round2(minutes * (comp.perMinuteRate ?? 0));

    rows.push({
      driverId,
      driverName: comp.driverName,
      compensationType: comp.compensationType,
      hourlyRate: comp.hourlyRate,
      perMinuteRate: comp.perMinuteRate,
      jobs: agg.jobs.size,
      workedHours: hours,
      workedMinutes: minutes,
      workedText: toDuration(hours).text,
      periodEarned,
      totalEarned,
      totalPaid,
      balance: round2(totalEarned - totalPaid),
    });
  }
  rows.sort((a, b) => b.workedHours - a.workedHours);

  return { period: { from: f.from ?? null, to: f.to ?? null }, rows };
}

// ---------------------------------------------------------------------------
// Machine-wise utilization report
// ---------------------------------------------------------------------------
export interface MachineReportRow {
  machineId: string;
  registrationNumber: string;
  brandModel: string;
  jobs: number;
  customers: number;
  workedHours: number;
  workedMinutes: number;
  workedText: string;
}

export async function getMachineReport(companyId: string, f: ReportFilters): Promise<{ period: { from: string | null; to: string | null }; rows: MachineReportRow[] }> {
  const jobs = await prisma.job.findMany({
    where: completedJobWhere(companyId, f),
    select: {
      id: true,
      machineId: true,
      actualHours: true,
      booking: { select: { customerId: true } },
      workSessions: { where: { endedAt: { not: null } }, select: { machineId: true, durationSec: true } },
    },
  });

  const perMachine = new Map<string, { hours: number; jobs: Set<string>; customers: Set<string> }>();
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const customerId = j.booking?.customerId;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    const addTo = (machineId: string, hours: number) => {
      if (f.machineId && machineId !== f.machineId) return;
      const e = perMachine.get(machineId) ?? { hours: 0, jobs: new Set(), customers: new Set() };
      e.hours += hours;
      e.jobs.add(j.id);
      if (customerId) e.customers.add(customerId);
      perMachine.set(machineId, e);
    };
    if (totalSec > 0) {
      const byMachine = new Map<string, number>();
      for (const w of j.workSessions) byMachine.set(w.machineId, (byMachine.get(w.machineId) ?? 0) + (w.durationSec ?? 0));
      for (const [mId, sec] of byMachine) addTo(mId, jobHours * (sec / totalSec));
    } else if (j.machineId) {
      addTo(j.machineId, jobHours);
    }
  }

  const machineIds = [...perMachine.keys()];
  const machines = await prisma.machine.findMany({
    where: { companyId, id: { in: machineIds.length ? machineIds : ["00000000-0000-0000-0000-000000000000"] } },
    select: { id: true, registrationNumber: true, brand: true, model: true },
  });
  const machineById = new Map(machines.map((m) => [m.id, m]));

  const rows: MachineReportRow[] = [];
  for (const [machineId, agg] of perMachine) {
    const m = machineById.get(machineId);
    const hours = round2(agg.hours);
    rows.push({
      machineId,
      registrationNumber: m?.registrationNumber ?? "—",
      brandModel: `${m?.brand ?? ""} ${m?.model ?? ""}`.trim(),
      jobs: agg.jobs.size,
      customers: agg.customers.size,
      workedHours: hours,
      workedMinutes: round2(agg.hours * 60),
      workedText: toDuration(hours).text,
    });
  }
  rows.sort((a, b) => b.workedHours - a.workedHours);

  return { period: { from: f.from ?? null, to: f.to ?? null }, rows };
}

// ---------------------------------------------------------------------------
// Machine maintenance report — status of every active machine.
// ---------------------------------------------------------------------------
export async function getMachineMaintenanceReport(companyId: string) {
  const machines = await prisma.machine.findMany({
    where: { companyId, isActive: true },
    select: { id: true },
    orderBy: { registrationNumber: "asc" },
  });
  const rows = [];
  for (const m of machines) {
    rows.push(await machineUtilizationService.getMachineMaintenanceStatus(companyId, m.id));
  }
  return rows;
}
