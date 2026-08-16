import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AccessTokenPayload, AuthenticatedUser } from "../modules/auth/auth.types";
import { AppError } from "../shared/errors/AppError";

// Authentication only — verifies the caller is who they say they are and
// attaches req.user. It does NOT check permissions; that is the RBAC
// module's job once it exists. Stateless by design (no DB call) so it stays
// cheap on every request; token revocation is handled at the refresh-token
// layer, not here.

function verifyAccessToken(token: string): AuthenticatedUser {
  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  if (payload.type !== "access") {
    throw new AppError(401, "Invalid token type");
  }
  return { id: payload.sub, companyId: payload.companyId, roleId: payload.roleId };
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length);
  } else if (typeof req.query.token === "string" && req.query.token.length > 0) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError(401, "Missing access token"));
  }
  try {
    req.user = verifyAccessToken(token);
  } catch (err) {
    return next(err);
  }
  next();
}

// For endpoints whose auth requirement depends on data, not just the route
// (e.g. §6 bootstrap: the first user registration is anonymous, every
// registration after that must be an authenticated Owner/Manager). A
// missing header is treated as anonymous; a header that IS present but
// invalid is still rejected — we never silently downgrade a bad token to
// "anonymous".
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }
  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
  } catch (err) {
    return next(err);
  }
  next();
}
