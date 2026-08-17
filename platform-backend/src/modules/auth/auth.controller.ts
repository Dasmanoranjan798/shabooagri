import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import * as authService from "./auth.service";
import { loginSchema, refreshSchema, registerSchema } from "./auth.validators";

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
