import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as staffInviteService from "./staffInvite.service";
import {
  acceptInviteSchema,
  createInviteSchema,
  setUserStatusSchema,
  verifyInviteTokenSchema,
} from "./staffInvite.validators";

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createInviteSchema.parse(req.body);
  const result = await staffInviteService.createInvite(user.companyId, user.id, input, req.headers.host);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const invites = await staffInviteService.listInvites(user.companyId);
  res.status(200).json(invites);
}

export async function revoke(req: Request, res: Response) {
  const user = requireUser(req);
  const invite = await staffInviteService.revokeInvite(user.companyId, req.params.id);
  res.status(200).json(invite);
}

export async function listUsers(req: Request, res: Response) {
  const user = requireUser(req);
  const users = await staffInviteService.listUsers(user.companyId);
  res.status(200).json(users);
}

export async function setUserStatus(req: Request, res: Response) {
  const user = requireUser(req);
  const input = setUserStatusSchema.parse(req.body);
  const updated = await staffInviteService.setUserStatus(user.companyId, req.params.id, input);
  res.status(200).json(updated);
}

export async function verifyToken(req: Request, res: Response) {
  const input = verifyInviteTokenSchema.parse(req.body);
  const result = await staffInviteService.verifyInviteToken(input.token);
  res.status(200).json(result);
}

export async function accept(req: Request, res: Response) {
  const input = acceptInviteSchema.parse(req.body);
  const result = await staffInviteService.acceptInvite(input);
  res.status(200).json(result);
}
