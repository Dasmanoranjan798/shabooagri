import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { logger } from "../shared/logger";

// Offline-first sync safety.
//
// The mobile app records transactions locally while offline and replays them
// from a durable outbox when connectivity returns. If a replayed request
// reached the server the first time but its acknowledgement was lost (dropped
// connection right after commit), a naive retry would create a *second*
// record — a duplicate booking, or worst of all a double payment.
//
// This middleware makes every mutating request idempotent on a client-supplied
// `Idempotency-Key` (a UUID the outbox generates once per operation and reuses
// on every retry):
//
//   * First time we see a key -> reserve it (status "in_progress"), run the
//     handler, capture the response, and store it against the key.
//   * Any later request with the same key -> replay the stored response
//     verbatim without touching the database again.
//
// Keys are client-generated UUIDs and therefore globally unique, so no tenant
// scoping is required for correctness; we still record companyId (when the
// tenant is resolvable) for auditing and pruning. Requests without the header
// (e.g. the web app) pass straight through unchanged — this is purely additive.
//
// Only 2xx responses are persisted for replay. The whole point is to avoid a
// duplicate *successful side effect*; any error (401 from an expired token
// mid-retry, 404 for a dependency that hasn't synced yet, 400 validation, 5xx)
// means no durable side effect happened, so the key is released and a genuine
// retry re-runs. Pinning a non-2xx would strand a queued operation on a
// transient failure it could otherwise recover from.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.header("Idempotency-Key");
  if (!key || !MUTATING.has(req.method)) {
    return next();
  }

  try {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

    if (existing) {
      if (existing.status === "completed" && existing.statusCode != null) {
        // Replay the original outcome. The client can't tell a replay from the
        // first success, which is exactly what we want.
        res.setHeader("Idempotent-Replayed", "true");
        return res.status(existing.statusCode).json(existing.response ?? {});
      }
      // A row exists but isn't completed: another copy of this request is still
      // in flight (or previously crashed mid-flight). Tell the client to retry
      // shortly rather than risk running the side effect twice concurrently.
      return res.status(409).json({
        error: "A request with this Idempotency-Key is still being processed. Please retry.",
      });
    }

    // Reserve the key. A unique-constraint race (two identical requests landing
    // together) collapses to the loser getting 409 above on its retry.
    try {
      await prisma.idempotencyKey.create({
        data: {
          key,
          companyId: req.user?.companyId ?? null,
          method: req.method,
          path: req.originalUrl.split("?")[0],
        },
      });
    } catch {
      return res.status(409).json({
        error: "A request with this Idempotency-Key is already being processed. Please retry.",
      });
    }

    // Capture the response body so we can replay it later. res.json is the one
    // sink every controller uses; wrap it to record what was sent.
    let captured: unknown;
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      captured = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      const status = res.statusCode;
      // Persist only a successful side effect (2xx) for replay; release the
      // reservation on any error so a genuine retry can re-run the operation.
      if (status >= 200 && status < 300) {
        prisma.idempotencyKey
          .update({
            where: { key },
            data: {
              status: "completed",
              statusCode: status,
              response: (captured ?? {}) as object,
            },
          })
          .catch((err) => logger.error("idempotency.persist_failed", { key, err: String(err) }));
      } else {
        prisma.idempotencyKey
          .delete({ where: { key } })
          .catch((err) => logger.error("idempotency.release_failed", { key, err: String(err) }));
      }
    });

    return next();
  } catch (err) {
    // Idempotency bookkeeping must never take down a real request.
    logger.error("idempotency.middleware_error", { err: String(err) });
    return next();
  }
}
