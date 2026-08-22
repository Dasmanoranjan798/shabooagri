import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../shared/logger";

declare global {
  namespace Express {
    interface Request {
      // Correlation id for this request — echoed back in the x-request-id
      // response header and attached to every log line for the request.
      requestId?: string;
    }
  }
}

// Assigns a request id (honoring an inbound x-request-id if present, so a
// proxy/load balancer trace id carries through) and logs one structured line
// per completed request: method, PATH ONLY (never req.originalUrl / query —
// upload routes carry ?token=<access token>, which must never be logged),
// status, and duration. Bodies and headers are never logged. 4xx logs at warn,
// 5xx at error, otherwise info.
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const inbound = req.headers["x-request-id"];
  const requestId = (typeof inbound === "string" && inbound.length > 0 && inbound.length <= 200 ? inbound : randomUUID());
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level]("http.request", {
      requestId,
      method: req.method,
      path: req.path,
      status,
      durationMs: Math.round(durationMs * 10) / 10,
      // Company context only when already resolved by tenantResolver — safe,
      // no secrets. Absent for pre-tenant/anonymous requests.
      companyId: req.tenantCompany?.id,
    });
  });

  next();
}
