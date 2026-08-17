import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../shared/errors/AppError";

// Platform auth is intentionally its own JWT: own secret (JWT_ACCESS_SECRET
// here is a completely different value from the operational backend's), own
// payload shape, own `type` discriminator. A token issued here can never be
// mistaken for — or verified against — an operational token, and vice versa.
export interface PlatformTokenPayload {
  sub: string;
  email: string;
  type: "platform_access" | "platform_refresh";
}

export interface PlatformAuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      platformUser?: PlatformAuthenticatedUser;
    }
  }
}

export function platformAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing access token"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as PlatformTokenPayload;
    if (payload.type !== "platform_access") {
      return next(new AppError(401, "Invalid token type"));
    }
    req.platformUser = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }
}
