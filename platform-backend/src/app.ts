import cors from "cors";
import express from "express";
import { prisma } from "./db/prisma";
import { errorMiddleware } from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { paymentRouter } from "./modules/payments/payment.routes";
import { provisioningRouter } from "./modules/provisioning/provisioning.routes";

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

app.use("/auth", authRouter);
app.use("/payments", paymentRouter);
app.use("/provisioning", provisioningRouter);

// Must be registered after all routes.
app.use(errorMiddleware);
