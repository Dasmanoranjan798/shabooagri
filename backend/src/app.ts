import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { prisma } from "./db/prisma";

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
