import type { Request } from "express";
import { AppError } from "../errors/AppError";

// Every authenticated controller needs req.platformUser narrowed from
// optional to required before it can read the user's id — one place for
// that check instead of each module's controller repeating it.
export function requirePlatformUser(req: Request) {
  if (!req.platformUser) {
    throw new AppError(401, "Not authenticated");
  }
  return req.platformUser;
}
