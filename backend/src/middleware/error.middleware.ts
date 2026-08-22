import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/AppError";
import { logger } from "../shared/logger";

// Central place that turns a thrown error into an HTTP response — no route
// or service handler formats its own error response. HTTP responses are
// unchanged from before; this only adds structured logging so unexpected
// server errors are captured with a stack trace and request correlation id
// instead of a bare console.error dump.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const base = { requestId: req.requestId, method: req.method, path: req.path };

  if (err instanceof AppError) {
    // Server-side AppErrors (5xx) are unexpected enough to log with detail;
    // 4xx are expected client errors already captured by the access log.
    if (err.statusCode >= 500) {
      logger.error("app_error", { ...base, status: err.statusCode, err });
    }
    return res.status(err.statusCode).json({ error: err.message, ...err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Master-data modules (Villages, Machines, ...) hit these constraints
    // directly (duplicate name, deleting a still-referenced row) — handled
    // once here instead of every module's service re-catching Prisma codes.
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with this value already exists" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "This record is still referenced by other data and cannot be deleted" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }
  // Unexpected/unhandled error — the one path that previously did console.error(err).
  logger.error("unhandled_error", { ...base, status: 500, err });
  return res.status(500).json({ error: "Internal server error" });
}
