import type { Request, Response } from "express";
import { z } from "zod";
import { requireUser } from "../../shared/utils/requireUser";
import * as pauseReasonService from "./pauseReason.service";

const createPauseReasonSchema = z.object({ label: z.string().trim().min(1).max(60) });

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const reasons = await pauseReasonService.list(user.companyId);
  res.status(200).json(reasons);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createPauseReasonSchema.parse(req.body);
  const reason = await pauseReasonService.create(user.companyId, input.label, user.id);
  res.status(201).json(reason);
}
