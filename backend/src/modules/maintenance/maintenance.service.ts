import { AppError } from "../../shared/errors/AppError";
import * as machineService from "../machines/machine.service";
import * as maintenanceRepo from "./maintenance.repository";
import type { CreateScheduleInput, UpdateScheduleInput, CreateRecordInput, UpdateRecordInput } from "./maintenance.validators";

// ---- Schedules ----

export function listSchedules(companyId: string, machineId?: string) {
  return maintenanceRepo.findSchedulesForCompany(companyId, machineId);
}

export async function getScheduleById(companyId: string, id: string) {
  const schedule = await maintenanceRepo.findScheduleByIdScoped(companyId, id);
  if (!schedule) throw new AppError(404, "Maintenance schedule not found");
  return schedule;
}

export async function createSchedule(companyId: string, input: CreateScheduleInput) {
  // Validate machine belongs to this company
  await machineService.getById(companyId, input.machineId);
  return maintenanceRepo.createSchedule(companyId, {
    machineId: input.machineId,
    intervalHours: input.intervalHours ?? null,
    intervalDays: input.intervalDays ?? null,
    description: input.description ?? null,
  });
}

export async function updateSchedule(companyId: string, id: string, input: UpdateScheduleInput) {
  await getScheduleById(companyId, id);
  await maintenanceRepo.updateScheduleScoped(companyId, id, input);
  return getScheduleById(companyId, id);
}

export async function deleteSchedule(companyId: string, id: string) {
  await getScheduleById(companyId, id);
  return maintenanceRepo.deleteScheduleScoped(companyId, id);
}

// ---- Records ----

export function listRecords(companyId: string, machineId?: string) {
  return maintenanceRepo.findRecordsForCompany(companyId, machineId);
}

export async function getRecordById(companyId: string, id: string) {
  const record = await maintenanceRepo.findRecordByIdScoped(companyId, id);
  if (!record) throw new AppError(404, "Maintenance record not found");
  return record;
}

export async function createRecord(companyId: string, input: CreateRecordInput) {
  // Validate machine and (optionally) schedule belong to company
  await machineService.getById(companyId, input.machineId);
  if (input.maintenanceScheduleId) {
    await getScheduleById(companyId, input.maintenanceScheduleId);
  }
  return maintenanceRepo.createRecord(companyId, {
    machineId: input.machineId,
    maintenanceScheduleId: input.maintenanceScheduleId ?? null,
    serviceDate: new Date(input.serviceDate),
    hourMeterAtService: input.hourMeterAtService ?? null,
    description: input.description ?? null,
    cost: input.cost ?? null,
    performedBy: input.performedBy ?? null,
  });
}

export async function updateRecord(companyId: string, id: string, input: UpdateRecordInput) {
  await getRecordById(companyId, id);
  await maintenanceRepo.updateRecordScoped(companyId, id, {
    ...(input.serviceDate ? { serviceDate: new Date(input.serviceDate) } : {}),
    hourMeterAtService: input.hourMeterAtService,
    description: input.description,
    cost: input.cost,
    performedBy: input.performedBy,
  });
  return getRecordById(companyId, id);
}

export async function deleteRecord(companyId: string, id: string) {
  await getRecordById(companyId, id);
  return maintenanceRepo.deleteRecordScoped(companyId, id);
}

// ---- Maintenance Alerts ----

export interface MaintenanceAlert {
  id: string;
  machineId: string;
  machineRegistration: string;
  machineBrandModel: string;
  description: string;
  intervalHours: number | null;
  intervalDays: number | null;
  currentWorkedHours: number;
  hoursSinceLastService: number;
  daysSinceLastService: number;
  lastServiceDate: Date | null;
  status: "OVERDUE" | "DUE_SOON" | "HEALTHY";
  reason: string;
}

export async function getMaintenanceAlerts(companyId: string): Promise<MaintenanceAlert[]> {
  const schedules = await maintenanceRepo.findActiveSchedulesWithRecordsAndJobs(companyId);
  const now = new Date();

  return schedules.map((sch) => {
    const totalHours = sch.machine.jobs.reduce((sum, j) => sum + (j.workedHours ? Number(j.workedHours) : 0), 0);
    const lastRecord = sch.records[0] || null;
    const lastDate = lastRecord ? new Date(lastRecord.serviceDate) : new Date(sch.machine.createdAt);
    const lastHours = lastRecord?.hourMeterAtService ? Number(lastRecord.hourMeterAtService) : 0;

    const hoursSince = Math.max(0, totalHours - lastHours);
    const daysSince = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));

    let status: "OVERDUE" | "DUE_SOON" | "HEALTHY" = "HEALTHY";
    let reason = "Service up-to-date";

    const isHoursOverdue = sch.intervalHours ? hoursSince >= sch.intervalHours : false;
    const isDaysOverdue = sch.intervalDays ? daysSince >= sch.intervalDays : false;

    const isHoursDueSoon = sch.intervalHours ? hoursSince >= sch.intervalHours * 0.85 : false;
    const isDaysDueSoon = sch.intervalDays ? daysSince >= Math.max(0, sch.intervalDays - 7) : false;

    if (isHoursOverdue || isDaysOverdue) {
      status = "OVERDUE";
      const reasonsArr: string[] = [];
      if (isHoursOverdue) reasonsArr.push(`${hoursSince.toFixed(1)} hrs worked vs ${sch.intervalHours} hrs limit`);
      if (isDaysOverdue) reasonsArr.push(`${daysSince} days elapsed vs ${sch.intervalDays} days limit`);
      reason = `Overdue: ${reasonsArr.join("; ")}`;
    } else if (isHoursDueSoon || isDaysDueSoon) {
      status = "DUE_SOON";
      const reasonsArr: string[] = [];
      if (isHoursDueSoon) reasonsArr.push(`${hoursSince.toFixed(1)} / ${sch.intervalHours} hrs worked`);
      if (isDaysDueSoon) reasonsArr.push(`${daysSince} / ${sch.intervalDays} days elapsed`);
      reason = `Due Soon: ${reasonsArr.join("; ")}`;
    }

    return {
      id: sch.id,
      machineId: sch.machineId,
      machineRegistration: sch.machine.registrationNumber,
      machineBrandModel: `${sch.machine.brand || ""} ${sch.machine.model || ""}`.trim(),
      description: sch.description || "Routine Maintenance",
      intervalHours: sch.intervalHours,
      intervalDays: sch.intervalDays,
      currentWorkedHours: totalHours,
      hoursSinceLastService: hoursSince,
      daysSinceLastService: daysSince,
      lastServiceDate: lastRecord ? lastRecord.serviceDate : null,
      status,
      reason,
    };
  });
}
