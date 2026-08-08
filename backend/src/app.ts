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

// Express app assembly only. Module routers are mounted here once they exist —
// this file must never contain business logic itself.
export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

// Phase 1 local-disk stub for booking attachments (see booking.upload.ts) —
// served back out as static files rather than through an authenticated
// route, so this is only as private as the URL is hard to guess. Fine for
// a pilot; revisit (signed URLs / object storage) before wider rollout.
app.use("/uploads/booking-attachments", express.static(BOOKING_ATTACHMENT_UPLOAD_ROOT));
app.use("/uploads/job-photos", express.static(JOB_PHOTO_UPLOAD_ROOT));

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

// Must be registered after all routes.
app.use(errorMiddleware);
