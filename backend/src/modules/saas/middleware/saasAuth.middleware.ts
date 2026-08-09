import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/AppError";

export interface SaasAuthenticatedUser {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface SaasTokenPayload {
  sub: string;
  email: string;
  isPlatformAdmin: boolean;
  type: "saas_access" | "saas_refresh";
}

declare global {
  namespace Express {
    interface Request {
      saasUser?: SaasAuthenticatedUser;
    }
  }
}

export function generateSaasTokens(user: { id: string; email: string; isPlatformAdmin: boolean }) {
  const accessTokenPayload: SaasTokenPayload = {
    sub: user.id,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
    type: "saas_access",
  };

  const accessToken = jwt.sign(accessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: "1d",
  });

  return { accessToken };
}

export function saasAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing SaaS bearer token"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as SaasTokenPayload;
    if (payload.type !== "saas_access") {
      return next(new AppError(401, "Invalid SaaS token type"));
    }
    req.saasUser = {
      id: payload.sub,
      email: payload.email,
      isPlatformAdmin: payload.isPlatformAdmin,
    };
    next();
  } catch {
    return next(new AppError(401, "Invalid or expired SaaS token"));
  }
}

export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.saasUser) {
    return next(new AppError(401, "SaaS authentication required"));
  }
  if (!req.saasUser.isPlatformAdmin) {
    return next(new AppError(403, "Access denied: Platform Administrator privileges required"));
  }
  next();
}
