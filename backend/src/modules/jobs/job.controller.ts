import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requireUser } from "../../shared/utils/requireUser";
import * as jobService from "./job.service";
import * as jobReportService from "./jobReport.service";
import {
  addFuelEntrySchema,
  addJobPhotoSchema,
  addTransportChargeSchema,
  cancelJobSchema,
  changeDriverSchema,
  changeMachineSchema,
  createManualJobSchema,
  pauseJobSchema,
  resumeJobSchema,
  startJobSchema,
  stopJobSchema,
  submitJobSchema,
  updateJobSchema,
} from "./job.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const jobs = await jobService.list(user.companyId, user);
  res.status(200).json(jobs);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const job = await jobService.getById(user.companyId, req.params.id, user);
  res.status(200).json(job);
}

export async function updateDetails(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateJobSchema.parse(req.body);
  const job = await jobService.updateDetails(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function start(req: Request, res: Response) {
  const user = requireUser(req);
  const input = startJobSchema.parse(req.body);
  const job = await jobService.start(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function pause(req: Request, res: Response) {
  const user = requireUser(req);
  const input = pauseJobSchema.parse(req.body);
  const job = await jobService.pause(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function resume(req: Request, res: Response) {
  const user = requireUser(req);
  const input = resumeJobSchema.parse(req.body);
  const job = await jobService.resume(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function stop(req: Request, res: Response) {
  const user = requireUser(req);
  const input = stopJobSchema.parse(req.body);
  const job = await jobService.stop(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function submit(req: Request, res: Response) {
  const user = requireUser(req);
  const input = submitJobSchema.parse(req.body);
  const job = await jobService.submit(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function cancel(req: Request, res: Response) {
  const user = requireUser(req);
  const input = cancelJobSchema.parse(req.body);
  const job = await jobService.cancel(user.companyId, req.params.id, user, input.reason);
  res.status(200).json(job);
}

export async function listFuelEntries(req: Request, res: Response) {
  const user = requireUser(req);
  const entries = await jobService.listFuelEntries(user.companyId, req.params.id, user);
  res.status(200).json(entries);
}

export async function addFuelEntry(req: Request, res: Response) {
  const user = requireUser(req);
  const input = addFuelEntrySchema.parse(req.body);
  const entry = await jobService.addFuelEntry(user.companyId, req.params.id, user, input.litres, input.cost);
  res.status(201).json(entry);
}

export async function listPhotos(req: Request, res: Response) {
  const user = requireUser(req);
  const photos = await jobService.listPhotos(user.companyId, req.params.id, user);
  res.status(200).json(photos);
}

export async function addPhoto(req: Request, res: Response) {
  const user = requireUser(req);
  if (!req.file) {
    throw new AppError(400, "No file uploaded (expected multipart field \"file\")");
  }
  const { caption } = addJobPhotoSchema.parse(req.body);
  const fileUrl = `/uploads/job-photos/${user.companyId}/${req.params.id}/${req.file.filename}`;
  const photo = await jobService.addPhoto(user.companyId, req.params.id, user, fileUrl, caption);
  res.status(201).json(photo);
}

export async function createManualJob(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createManualJobSchema.parse(req.body);
  const job = await jobService.createManualEntryJob(user.companyId, user.id, user, input);
  res.status(201).json(job);
}

export async function changeMachine(req: Request, res: Response) {
  const user = requireUser(req);
  const input = changeMachineSchema.parse(req.body);
  const job = await jobService.changeMachine(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function changeDriver(req: Request, res: Response) {
  const user = requireUser(req);
  const input = changeDriverSchema.parse(req.body);
  const job = await jobService.changeDriver(user.companyId, req.params.id, user, input);
  res.status(200).json(job);
}

export async function listAssignmentChanges(req: Request, res: Response) {
  const user = requireUser(req);
  const changes = await jobService.listAssignmentChanges(user.companyId, req.params.id, user);
  res.status(200).json(changes);
}

export async function listWorkSessions(req: Request, res: Response) {
  const user = requireUser(req);
  const sessions = await jobService.listWorkSessions(user.companyId, req.params.id, user);
  res.status(200).json(sessions);
}

export async function workSummary(req: Request, res: Response) {
  const user = requireUser(req);
  const summary = await jobReportService.getJobWorkSummary(user.companyId, req.params.id, user);
  res.status(200).json(summary);
}

export async function listTransportCharges(req: Request, res: Response) {
  const user = requireUser(req);
  const charges = await jobService.listTransportCharges(user.companyId, req.params.id, user);
  res.status(200).json(charges);
}

export async function addTransportCharge(req: Request, res: Response) {
  const user = requireUser(req);
  const input = addTransportChargeSchema.parse(req.body);
  const charge = await jobService.addTransportCharge(user.companyId, req.params.id, user, input);
  res.status(201).json(charge);
}

export async function deleteTransportCharge(req: Request, res: Response) {
  const user = requireUser(req);
  await jobService.deleteTransportCharge(user.companyId, req.params.id, req.params.chargeId, user);
  res.status(204).send();
}
