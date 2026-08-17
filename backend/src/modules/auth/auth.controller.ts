import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import * as authService from "./auth.service";
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  logoutSchema,
  otpRequestSchema,
  otpVerifySchema,
  passwordLoginSchema,
  pinLoginSchema,
  refreshSchema,
  registerSchema,
  requestPasswordResetSchema,
  ssoExchangeSchema,
  verifyPasswordResetTokenSchema,
} from "./auth.validators";

// Thin HTTP layer: parse the request, call the service, shape the response.
// No business rule is decided in this file.

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input, req.user, req.tenantCompany);
  res.status(201).json(result);
}

export async function requestOtp(req: Request, res: Response) {
  const input = otpRequestSchema.parse(req.body);
  const result = await authService.requestOtp(input, req.tenantCompany);
  res.status(200).json(result);
}

export async function verifyOtp(req: Request, res: Response) {
  const input = otpVerifySchema.parse(req.body);
  const result = await authService.verifyOtpAndLogin(input, req.tenantCompany);
  res.status(200).json(result);
}

export async function loginWithPassword(req: Request, res: Response) {
  const input = passwordLoginSchema.parse(req.body);
  const result = await authService.loginWithPassword(input, req.tenantCompany);
  res.status(200).json(result);
}

export async function loginWithPin(req: Request, res: Response) {
  const input = pinLoginSchema.parse(req.body);
  const result = await authService.loginWithPin(input, req.tenantCompany);
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response) {
  const input = refreshSchema.parse(req.body);
  const result = await authService.refreshTokens(input);
  res.status(200).json(result);
}

// Public — the browser calls this directly after being redirected from the
// platform backend's provisioning flow. See auth.service.exchangeLaunchToken.
export async function ssoExchange(req: Request, res: Response) {
  const input = ssoExchangeSchema.parse(req.body);
  const result = await authService.exchangeLaunchToken(input.token);
  res.status(200).json(result);
}

export async function logout(req: Request, res: Response) {
  const input = logoutSchema.parse(req.body);
  const result = await authService.logout(input);
  res.status(200).json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "Not authenticated");
  }
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json(profile);
}

export async function requestPasswordReset(req: Request, res: Response) {
  const input = requestPasswordResetSchema.parse(req.body);
  const result = await authService.requestPasswordReset(input, req.tenantCompany, req.headers.host);
  res.status(200).json(result);
}

export async function verifyPasswordResetToken(req: Request, res: Response) {
  const input = verifyPasswordResetTokenSchema.parse(req.body);
  const result = await authService.verifyPasswordResetToken(input);
  res.status(200).json(result);
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const input = confirmPasswordResetSchema.parse(req.body);
  const result = await authService.confirmPasswordReset(input, req.tenantCompany);
  res.status(200).json(result);
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "Not authenticated");
  }
  const input = changePasswordSchema.parse(req.body);
  const result = await authService.changePassword(req.user.id, input);
  res.status(200).json(result);
}

