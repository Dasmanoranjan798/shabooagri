import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import * as authService from "./auth.service";
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestPasswordResetSchema,
  verifyPasswordResetTokenSchema,
} from "./auth.validators";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response) {
  const input = refreshSchema.parse(req.body);
  const result = await authService.refreshTokens(input);
  res.status(200).json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.platformUser) {
    throw new AppError(401, "Not authenticated");
  }
  const profile = await authService.getProfile(req.platformUser.id);
  res.status(200).json(profile);
}

export async function requestPasswordReset(req: Request, res: Response) {
  const input = requestPasswordResetSchema.parse(req.body);
  const result = await authService.requestPasswordReset(input);
  res.status(200).json(result);
}

export async function verifyPasswordResetToken(req: Request, res: Response) {
  const input = verifyPasswordResetTokenSchema.parse(req.body);
  const result = await authService.verifyPasswordResetToken(input);
  res.status(200).json(result);
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const input = confirmPasswordResetSchema.parse(req.body);
  const result = await authService.confirmPasswordReset(input);
  res.status(200).json(result);
}

export async function changePassword(req: Request, res: Response) {
  if (!req.platformUser) {
    throw new AppError(401, "Not authenticated");
  }
  const input = changePasswordSchema.parse(req.body);
  const result = await authService.changePassword(req.platformUser.id, input);
  res.status(200).json(result);
}
