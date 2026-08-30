import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { errorMiddleware } from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { bookingRouter } from "./modules/bookings/booking.routes";
import { UPLOAD_ROOT as BOOKING_ATTACHMENT_UPLOAD_ROOT } from "./modules/bookings/booking.upload";
import { machineTypeRouter } from "./modules/machine-types/machineType.routes";
import { machineRouter } from "./modules/machines/machine.routes";
import { employeeRouter } from "./modules/employees/employee.routes";
import { driverRouter } from "./modules/drivers/driver.routes";
import { customerRouter } from "./modules/customers/customer.routes";
import { jobRouter } from "./modules/jobs/job.routes";
import { UPLOAD_ROOT as JOB_PHOTO_UPLOAD_ROOT } from "./modules/jobs/job.upload";
import { pricingMethodRouter } from "./modules/pricing-methods/pricingMethod.routes";
import { villageRouter } from "./modules/villages/village.routes";
import { invoiceRouter, paymentRouter } from "./modules/payments/payment.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { expenseRouter } from "./modules/expenses/expense.routes";
import { fuelRouter } from "./modules/fuel/fuel.routes";
import { maintenanceRouter } from "./modules/maintenance/maintenance.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { rbacRouter } from "./modules/rbac/rbac.routes";
import { teamRouter } from "./modules/team/staffInvite.routes";
import { internalRouter } from "./modules/internal/internal.routes";
import { internalApiKeyMiddleware } from "./middleware/internalApiKey.middleware";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware";
import { idempotencyMiddleware } from "./middleware/idempotency.middleware";

// Express app assembly only. Module routers are mounted here once they exist —
// this file must never contain business logic itself.
export const app = express();

// Allowlist of browser origins permitted to make credentialed cross-origin
// requests. Sourced from CORS_ORIGIN (comma-separated to support more than one
// origin, e.g. prod + a staging host, without a new config format; a single
// value like the current "https://shabooagri.com" still works unchanged).
// The operational web app itself is served same-origin per tenant subdomain
// and never triggers CORS; this list only governs genuine cross-origin
// browser callers.
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header at all (native mobile app via Dio, curl,
      // server-to-server) — not a browser CORS scenario, allow through.
      if (!origin) return callback(null, true);
      // Only an explicitly configured origin gets an Access-Control-Allow-
      // Origin echoed back (to that specific origin, never "*", so it stays
      // compatible with credentials: true). Any other origin is NOT reflected:
      // the browser then blocks the cross-origin response. This is a plain
      // "no CORS header" outcome, not a thrown error — non-browser callers are
      // unaffected and no request 500s.
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Structured request logging + correlation id — as early as possible so every
// request (including json parse failures) gets an id and an access-log line.
app.use(requestLoggerMiddleware);

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

import { authMiddleware } from "./middleware/auth.middleware";
import { tenantResolverMiddleware } from "./middleware/tenantResolver.middleware";

// Protected file serving for booking attachments and job photos — requires a valid
// access token (passed via Authorization Bearer header or ?token= query parameter).
app.use("/uploads/booking-attachments", authMiddleware, express.static(BOOKING_ATTACHMENT_UPLOAD_ROOT));
app.use("/uploads/job-photos", authMiddleware, express.static(JOB_PHOTO_UPLOAD_ROOT));

// Mounted BEFORE tenantResolverMiddleware and without authMiddleware —
// this endpoint has no operational company/user context to resolve yet
// (it's what CREATES that context), and Express stops here for any
// matching /internal/* request, so tenantResolverMiddleware never runs
// for these calls at all. This is the platform backend's one and only
// connection point into this app; nothing else reaches it, and nothing
// on the operational request path below depends on it.
app.use("/internal", internalApiKeyMiddleware, internalRouter);

app.use(tenantResolverMiddleware);

// Offline-first safety: dedupe replayed mutations by Idempotency-Key so the
// mobile outbox can retry after a lost ack without ever duplicating a record
// or a payment. No-ops for requests without the header (e.g. the web app).
app.use(idempotencyMiddleware);

app.use("/auth", authRouter);
app.use("/villages", villageRouter);
app.use("/machine-types", machineTypeRouter);
app.use("/machines", machineRouter);
app.use("/employees", employeeRouter);
app.use("/drivers", driverRouter);
app.use("/customers", customerRouter);
app.use("/pricing-methods", pricingMethodRouter);
app.use("/bookings", bookingRouter);
app.use("/jobs", jobRouter);
app.use("/invoices", invoiceRouter);
app.use("/payments", paymentRouter);
app.use("/expenses", expenseRouter);
app.use("/fuel", fuelRouter);
app.use("/maintenance", maintenanceRouter);
app.use("/settings", settingsRouter);
app.use("/rbac", rbacRouter);
app.use("/team", teamRouter);
app.use("/dashboard", dashboardRouter);

// Must be registered after all routes.
app.use(errorMiddleware);
