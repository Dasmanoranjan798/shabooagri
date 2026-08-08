import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requireUser } from "../../shared/utils/requireUser";
import * as jobService from "./job.service";
import {
  addFuelEntrySchema,
  addJobPhotoSchema,
  completeJobSchema,
  pauseJobSchema,
  resumeJobSchema,
  startJobSchema,
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

export async function complete(req: Request, res: Response) {
  const user = requireUser(req);
  const input = completeJobSchema.parse(req.body);
  const job = await jobService.complete(user.companyId, req.params.id, user, input);
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
