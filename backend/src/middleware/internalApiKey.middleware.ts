import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../shared/errors/AppError";

// Gate for the /internal/* router only — deliberately NOT authMiddleware
// (no operational User/company context exists yet for a company that's
// still being provisioned) and NOT tenantResolverMiddleware (this router
// is mounted ahead of it in app.ts specifically so it never runs at all
// for these requests). A single shared key, checked in constant time,
// presented only by the platform backend server-to-server — never a
// browser, never a user-facing credential.
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function internalApiKeyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!env.INTERNAL_API_KEY) {
    return next(new AppError(503, "Internal provisioning is not configured on this server"));
  }
  const provided = req.headers["x-internal-api-key"];
  if (typeof provided !== "string" || !safeEquals(provided, env.INTERNAL_API_KEY)) {
    return next(new AppError(401, "Invalid or missing internal API key"));
  }
  next();
}
