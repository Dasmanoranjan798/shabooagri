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
