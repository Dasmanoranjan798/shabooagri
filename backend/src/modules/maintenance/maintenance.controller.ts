import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as maintenanceService from "./maintenance.service";
import {
  createScheduleSchema,
  updateScheduleSchema,
  createRecordSchema,
  updateRecordSchema,
} from "./maintenance.validators";

// ---- Schedule controllers ----

export async function listSchedules(req: Request, res: Response) {
  const user = requireUser(req);
  const machineId = typeof req.query.machineId === "string" ? req.query.machineId : undefined;
  const schedules = await maintenanceService.listSchedules(user.companyId, machineId);
  res.json(schedules);
}

export async function getScheduleById(req: Request, res: Response) {
  const user = requireUser(req);
  const schedule = await maintenanceService.getScheduleById(user.companyId, req.params.id);
  res.json(schedule);
}

export async function createSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createScheduleSchema.parse(req.body);
  const schedule = await maintenanceService.createSchedule(user.companyId, input);
  res.status(201).json(schedule);
}

export async function updateSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateScheduleSchema.parse(req.body);
  const schedule = await maintenanceService.updateSchedule(user.companyId, req.params.id, input);
  res.json(schedule);
}

export async function removeSchedule(req: Request, res: Response) {
  const user = requireUser(req);
  await maintenanceService.deleteSchedule(user.companyId, req.params.id);
  res.status(204).send();
}

// ---- Record controllers ----

export async function listRecords(req: Request, res: Response) {
  const user = requireUser(req);
  const machineId = typeof req.query.machineId === "string" ? req.query.machineId : undefined;
  const records = await maintenanceService.listRecords(user.companyId, machineId);
  res.json(records);
}

export async function getRecordById(req: Request, res: Response) {
  const user = requireUser(req);
  const record = await maintenanceService.getRecordById(user.companyId, req.params.id);
  res.json(record);
}

export async function createRecord(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createRecordSchema.parse(req.body);
  const record = await maintenanceService.createRecord(user.companyId, input, user.id);
  res.status(201).json(record);
}

export async function updateRecord(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateRecordSchema.parse(req.body);
  const record = await maintenanceService.updateRecord(user.companyId, req.params.id, input);
  res.json(record);
}

export async function removeRecord(req: Request, res: Response) {
  const user = requireUser(req);
  await maintenanceService.deleteRecord(user.companyId, req.params.id);
  res.status(204).send();
}

// ---- Alert controller ----

export async function listAlerts(req: Request, res: Response) {
  const user = requireUser(req);
  const alerts = await maintenanceService.getMaintenanceAlerts(user.companyId);
  res.json(alerts);
}
