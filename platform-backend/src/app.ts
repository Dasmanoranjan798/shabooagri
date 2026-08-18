import cors from "cors";
import express from "express";
import { prisma } from "./db/prisma";
import { errorMiddleware } from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { paymentRouter } from "./modules/payments/payment.routes";
import { provisioningRouter } from "./modules/provisioning/provisioning.routes";
import { plansRouter } from "./modules/plans/plans.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { contactRouter } from "./modules/contact/contact.routes";

// Express app assembly only, exactly like the operational backend's
// app.ts. This process has no knowledge of the operational app's routes,
// middleware, or database at all — the only place it ever reaches out to
// the operational backend is modules/provisioning, via plain HTTP.
export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

app.get("/api/app-version", (_req, res) => {
  res.status(200).json({
    version: "0.1.0",
    downloadUrl: "https://shabooagri.com/app",
    mandatory: false
  });
});

app.use("/auth", authRouter);
app.use("/payments", paymentRouter);
app.use("/provisioning", provisioningRouter);
app.use("/plans", plansRouter);
app.use("/admin", adminRouter);
// Namespaced under /api rather than /contact -- the platform-frontend also
// owns a page at /contact (the Contact Us form itself), and nginx's
// path-prefix proxy match can't distinguish "GET /contact the page" from
// "POST /contact/feedback the API call". /api/* is never used for a page.
app.use("/api/contact", contactRouter);

// Must be registered after all routes.
app.use(errorMiddleware);
