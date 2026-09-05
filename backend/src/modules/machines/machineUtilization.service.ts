import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";

// ============================================================================
// The single authoritative machine-hour calculation. Both the machine record
// and every maintenance calculation derive from here — there is no second
// machine counter. Worked time is attributed from the WORK-SESSION history
// (per-machine durationSec), never from a job's *current* machineId, so a job
// whose machine was reassigned mid-way keeps a truthful per-machine split and
// editing/cancelling/reassigning work reconciles automatically (nothing is a
// stored, drift-prone counter — it is always re-derived).
// ============================================================================

export interface Duration {
  hours: number; // whole hours
  minutes: number; // remaining whole minutes (0-59)
  decimalHours: number; // canonical value, 2dp
  totalMinutes: number; // canonical in minutes, 2dp
  text: string; // "1,248 h 35 min"
}

function toDuration(decimalHours: number): Duration {
  const safe = Math.max(0, decimalHours);
  const decimalHoursRounded = Math.round(safe * 100) / 100;
  const totalWholeMinutes = Math.round(safe * 60);
  const hours = Math.floor(totalWholeMinutes / 60);
  const minutes = totalWholeMinutes % 60;
  return {
    hours,
    minutes,
    decimalHours: decimalHoursRounded,
    totalMinutes: Math.round(safe * 60 * 100) / 100,
    text: `${hours.toLocaleString("en-IN")} h ${minutes} min`,
  };
}

// Session-attributed worked hours for one machine (mirrors
// driverCompensation): each completed job's authoritative actualHours is
// split across its sessions proportionally to per-machine session seconds;
// jobs with no sessions (manual/legacy) fall back to the current machineId.
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

  let total = 0;
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    if (totalSec > 0) {
      const machineSec = j.workSessions
        .filter((w) => w.machineId === machineId)
        .reduce((s, w) => s + (w.durationSec ?? 0), 0);
      total += jobHours * (machineSec / totalSec);
    } else if (j.machineId === machineId) {
      total += jobHours;
    }
  }
  return Math.round(total * 100) / 100;
}

export interface MachineCustomerWorkRow {
  customerId: string;
  customerName: string;
  village: string | null;
  jobs: number;
  workedHours: number;
  workedMinutes: number;
  workedText: string;
  lastWorkedDate: string | null;
}

// Which customers/jobs generated this machine's working time, per customer —
// from the SAME session-attributed completed-job data as getMachineWorkedHours,
// so per-customer hours reconcile to the machine total. Grouped by job →
// booking → customer. No separate machine-hour ledger.
export async function getMachineCustomerWiseWork(
  companyId: string,
  machineId: string,
): Promise<MachineCustomerWorkRow[]> {
  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      OR: [{ machineId }, { workSessions: { some: { machineId } } }],
    },
    select: {
      machineId: true,
      actualHours: true,
      endTime: true,
      updatedAt: true,
      booking: { select: { customerId: true, customer: { select: { name: true, village: true } } } },
      workSessions: { where: { endedAt: { not: null } }, select: { machineId: true, durationSec: true } },
    },
  });

  const map = new Map<string, { row: MachineCustomerWorkRow; hours: number; date: Date | null }>();
  for (const j of jobs) {
    const jobHours = j.actualHours ? Number(j.actualHours) : 0;
    const totalSec = j.workSessions.reduce((s, w) => s + (w.durationSec ?? 0), 0);
    let attributed: number;
    if (totalSec > 0) {
      const machineSec = j.workSessions
        .filter((w) => w.machineId === machineId)
        .reduce((s, w) => s + (w.durationSec ?? 0), 0);
      attributed = jobHours * (machineSec / totalSec);
    } else {
      attributed = j.machineId === machineId ? jobHours : 0;
    }
    if (attributed <= 0 && j.machineId !== machineId) continue;

    const cid = j.booking.customerId;
    const when = j.endTime ?? j.updatedAt;
    const existing = map.get(cid);
    if (existing) {
      existing.hours += attributed;
      existing.row.jobs += 1;
      if (when && (!existing.date || when > existing.date)) existing.date = when;
    } else {
      map.set(cid, {
        row: {
          customerId: cid,
          customerName: j.booking.customer.name,
          village: j.booking.customer.village,
          jobs: 1,
          workedHours: 0,
          workedMinutes: 0,
          workedText: "",
          lastWorkedDate: null,
        },
        hours: attributed,
        date: when ?? null,
      });
    }
  }

  return Array.from(map.values())
    .map(({ row, hours, date }) => {
      const d = toDuration(hours);
      return {
        ...row,
        workedHours: d.decimalHours,
        workedMinutes: d.totalMinutes,
        workedText: d.text,
        lastWorkedDate: date ? date.toISOString() : null,
      };
    })
    .sort((a, b) => b.workedHours - a.workedHours);
}

export type MaintenanceStatus =
  | "NORMAL"
  | "DUE_SOON"
  | "DUE"
  | "OVERDUE"
  | "UNDER_MAINTENANCE"
  | "TRACKING_DISABLED";

export interface MachineMaintenanceStatus {
  machineId: string;
  registrationNumber: string;
  brandModel: string;
  machineStatus: string; // WORKING | AVAILABLE | REPAIR | OFFLINE
  totalWorked: Duration;
  trackingEnabled: boolean;
  intervalHours: number | null;
  scheduleId: string | null;
  scheduleDescription: string | null;
  lastServiceDate: string | null;
  lastServiceHours: number | null;
  workedSinceLastService: Duration;
  remainingToService: Duration; // 0 once due/overdue
  overdueBy: Duration; // 0 unless overdue
  nextServiceThresholdHours: number | null;
  status: MaintenanceStatus;
  message: string;
}

const EPS = 0.01;
const DUE_SOON_FRACTION = 0.85;

interface MachineRow {
  id: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
  createdAt: Date;
}

// Pure calculation from already-loaded inputs, so the machine record, the
// maintenance report, and maintenance alerts all produce identical numbers.
export function computeMaintenanceStatus(
  machine: MachineRow,
  totalWorkedHours: number,
  schedule: { id: string; intervalHours: number | null; description: string | null } | null,
  lastRecord: { serviceDate: Date; hourMeterAtService: number | null } | null,
): MachineMaintenanceStatus {
  const base = {
    machineId: machine.id,
    registrationNumber: machine.registrationNumber,
    brandModel: `${machine.brand ?? ""} ${machine.model ?? ""}`.trim(),
    machineStatus: machine.status,
    totalWorked: toDuration(totalWorkedHours),
    lastServiceDate: lastRecord ? lastRecord.serviceDate.toISOString() : null,
    lastServiceHours: lastRecord?.hourMeterAtService != null ? Number(lastRecord.hourMeterAtService) : null,
  };

  const intervalHours = schedule?.intervalHours != null ? Number(schedule.intervalHours) : null;

  // No hour-based schedule → tracking disabled (days-only schedules are not
  // this feature's concern; alerts still cover them separately).
  if (!schedule || intervalHours == null || intervalHours <= 0) {
    return {
      ...base,
      trackingEnabled: false,
      intervalHours: null,
      scheduleId: schedule?.id ?? null,
      scheduleDescription: schedule?.description ?? null,
      workedSinceLastService: toDuration(0),
      remainingToService: toDuration(0),
      overdueBy: toDuration(0),
      nextServiceThresholdHours: null,
      status: machine.status === "REPAIR" ? "UNDER_MAINTENANCE" : "TRACKING_DISABLED",
      message: machine.status === "REPAIR" ? "Currently under maintenance" : "Hour-based maintenance tracking not configured",
    };
  }

  const lastHours = base.lastServiceHours ?? 0;
  const hoursSince = Math.max(0, Math.round((totalWorkedHours - lastHours) * 100) / 100);
  const nextThreshold = Math.round((lastHours + intervalHours) * 100) / 100;
  const remaining = Math.round((intervalHours - hoursSince) * 100) / 100;
  const overdue = Math.round((hoursSince - intervalHours) * 100) / 100;

  let status: MaintenanceStatus;
  let message: string;
  if (machine.status === "REPAIR") {
    status = "UNDER_MAINTENANCE";
    message = "Currently under maintenance";
  } else if (overdue > EPS) {
    status = "OVERDUE";
    message = `Maintenance overdue by ${toDuration(overdue).text}`;
  } else if (Math.abs(overdue) <= EPS || remaining <= EPS) {
    status = "DUE";
    message = "Maintenance due now";
  } else if (hoursSince >= intervalHours * DUE_SOON_FRACTION) {
    status = "DUE_SOON";
    message = `Maintenance due soon — ${toDuration(remaining).text} remaining`;
  } else {
    status = "NORMAL";
    message = `${toDuration(remaining).text} remaining until next service`;
  }

  return {
    ...base,
    trackingEnabled: true,
    intervalHours,
    scheduleId: schedule.id,
    scheduleDescription: schedule.description,
    workedSinceLastService: toDuration(hoursSince),
    remainingToService: toDuration(Math.max(0, remaining)),
    overdueBy: toDuration(Math.max(0, overdue)),
    nextServiceThresholdHours: nextThreshold,
    status,
    message,
  };
}

// Picks the active hours-based schedule with the least remaining headroom
// (the most urgent) as the machine's primary maintenance status.
async function getPrimaryHoursSchedule(companyId: string, machineId: string, totalWorkedHours: number) {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { companyId, machineId, isActive: true, intervalHours: { not: null } },
    include: { records: { orderBy: { serviceDate: "desc" }, take: 1 } },
  });
  if (schedules.length === 0) return null;

  let best: { schedule: (typeof schedules)[number]; remaining: number } | null = null;
  for (const s of schedules) {
    const interval = Number(s.intervalHours);
    const lastHours = s.records[0]?.hourMeterAtService != null ? Number(s.records[0].hourMeterAtService) : 0;
    const remaining = interval - Math.max(0, totalWorkedHours - lastHours);
    if (best == null || remaining < best.remaining) best = { schedule: s, remaining };
  }
  return best!.schedule;
}

// Full maintenance status for a single machine (used by the machine record
// and the maintenance report).
export async function getMachineMaintenanceStatus(
  companyId: string,
  machineId: string,
): Promise<MachineMaintenanceStatus> {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, companyId },
    select: { id: true, registrationNumber: true, brand: true, model: true, status: true, createdAt: true },
  });
  if (!machine) throw new AppError(404, "Machine not found");

  const totalWorkedHours = await getMachineWorkedHours(companyId, machineId);
  const schedule = await getPrimaryHoursSchedule(companyId, machineId, totalWorkedHours);
  const lastRecord = schedule?.records?.[0]
    ? { serviceDate: schedule.records[0].serviceDate, hourMeterAtService: schedule.records[0].hourMeterAtService != null ? Number(schedule.records[0].hourMeterAtService) : null }
    : await latestRecordForMachine(companyId, machineId);

  return computeMaintenanceStatus(
    machine,
    totalWorkedHours,
    schedule ? { id: schedule.id, intervalHours: schedule.intervalHours != null ? Number(schedule.intervalHours) : null, description: schedule.description } : null,
    lastRecord,
  );
}

async function latestRecordForMachine(companyId: string, machineId: string) {
  const rec = await prisma.maintenanceRecord.findFirst({
    where: { companyId, machineId },
    orderBy: { serviceDate: "desc" },
    select: { serviceDate: true, hourMeterAtService: true },
  });
  return rec ? { serviceDate: rec.serviceDate, hourMeterAtService: rec.hourMeterAtService != null ? Number(rec.hourMeterAtService) : null } : null;
}

export { toDuration };
