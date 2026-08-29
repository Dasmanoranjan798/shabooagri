import type { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors/AppError";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

/**
 * In-memory rate limiter for public, auth, and payment endpoints to prevent abuse.
 * @param windowMs Time window in milliseconds (default 15 minutes)
 * @param maxRequests Maximum requests allowed per window (default 10 requests)
 * @param errorMessage Custom error message when rate limit is exceeded
 */
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 10,
  errorMessage: string = "Too many requests. Please try again later."
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Bucket per (source IP, endpoint, account identifier) so a brute-force
    // run against ONE account from ONE source is throttled, without letting a
    // single shared NAT IP lock every user out at once. `email` keeps the
    // existing password-reset/invite behavior; `identifier`/`mobileNumber`
    // cover the login and OTP endpoints (see auth.validators). Lower-cased and
    // trimmed so trivial casing/whitespace variations can't sidestep the
    // bucket. The identifier is only used to build the key — it is never
    // logged, and no password/PIN/OTP/token value is read here.
    const rawIdentifier = req.body?.email || req.body?.identifier || req.body?.mobileNumber || "";
    const identifier = String(rawIdentifier).toLowerCase().trim();
    const key = `${req.ip || "unknown"}:${req.path}:${identifier}`;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      throw new AppError(429, errorMessage);
    }

    record.count += 1;
    next();
  };
}
