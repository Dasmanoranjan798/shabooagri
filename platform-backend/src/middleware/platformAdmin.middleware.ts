import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors/AppError";
import { prisma } from "../db/prisma";

// Chained after platformAuthMiddleware. Looks isPlatformAdmin up fresh
// from the DB rather than trusting a claim baked into the JWT at login
// time — admin access can be revoked and should take effect immediately,
// not only after the token expires and is reissued. This is a low-
// traffic area (owner-only dashboard), so the extra query per request is
// a fine trade for that correctness.
export async function platformAdminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.platformUser) {
    return next(new AppError(401, "Not authenticated"));
  }
  const user = await prisma.platformUser.findUnique({ where: { id: req.platformUser.id } });
  if (!user?.isPlatformAdmin) {
    return next(new AppError(403, "Admin access required"));
  }
  next();
}
