import type { Request } from "express";
import { AppError } from "../errors/AppError";

// Every authenticated controller needs req.user narrowed from optional to
// required before it can read companyId/roleId — one place for that check
// instead of each module's controller repeating it.
export function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "Not authenticated");
  }
  return req.user;
}
