import express from "express";
import type { AddressInfo } from "net";
import { randomUUID } from "crypto";
import { idempotencyMiddleware } from "../src/middleware/idempotency.middleware";
import { prisma } from "../src/db/prisma";

// End-to-end proof of the offline-sync safety guarantee: a mutating request
// replayed with the same Idempotency-Key runs its side effect exactly once and
// replays the original response — so the mobile outbox can retry after a lost
// acknowledgement without ever creating a duplicate record or a double payment.
// Exercises the real middleware against the real idempotency_keys table on a
// tiny throwaway app, so it stays independent of route auth/permission seeding.

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
}

async function waitForCompleted(key: string, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (row?.status === "completed") return row;
    await new Promise((r) => setTimeout(r, 50));
  }
  return prisma.idempotencyKey.findUnique({ where: { key } });
}

async function waitForAbsent(key: string, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

async function runTests() {
  console.log("Starting Idempotency middleware end-to-end tests...\n");

  let createCount = 0; // stands in for a real create/payment side effect
  let boomCount = 0;
  let forbiddenCount = 0;

  const app = express();
  app.use(express.json());
  app.use(idempotencyMiddleware);
  app.post("/thing", (req, res) => {
    createCount += 1;
    res.status(201).json({ id: `thing-${createCount}`, echo: req.body });
  });
  // Always 500: proves a transient server error is NOT pinned — the key is
  // released so a genuine retry re-runs.
  app.post("/boom", (_req, res) => {
    boomCount += 1;
    res.status(500).json({ error: "boom" });
  });
  // Always 403: stands in for an expired-token / not-yet-permitted retry — a
  // 4xx must also release the key so the op isn't stranded on a transient auth
  // state and can succeed once conditions are right.
  app.post("/forbidden", (_req, res) => {
    forbiddenCount += 1;
    res.status(403).json({ error: "forbidden" });
  });

  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const keysToCleanup: string[] = [];

  try {
    // --- TEST 1: same key -> side effect once, response replayed ---
    const key1 = randomUUID();
    keysToCleanup.push(key1);

    const res1 = await fetch(`${base}/thing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key1 },
      body: JSON.stringify({ amount: 500 }),
    });
    const body1 = await res1.json();
    assert(res1.status === 201, "first request should return 201");
    assert(createCount === 1, "side effect should have run exactly once");

    // Wait for the finish-handler to persist the response before replaying.
    const stored = await waitForCompleted(key1);
    assert(stored?.status === "completed", "key should be recorded completed");

    const res2 = await fetch(`${base}/thing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key1 },
      body: JSON.stringify({ amount: 500 }),
    });
    const body2 = await res2.json();
    assert(res2.status === 201, "replay should return the original 201");
    assert(res2.headers.get("Idempotent-Replayed") === "true", "replay should be flagged");
    assert(createCount === 1, "side effect must NOT run again on replay (no duplicate)");
    assert(JSON.stringify(body1) === JSON.stringify(body2), "replayed body must equal the original");
    console.log(" [TEST 1] Same Idempotency-Key -> side effect ran once, response replayed. No duplicate.");

    // --- TEST 2: different key -> runs again ---
    const key2 = randomUUID();
    keysToCleanup.push(key2);
    const res3 = await fetch(`${base}/thing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key2 },
      body: JSON.stringify({ amount: 500 }),
    });
    await res3.json();
    assert(createCount === 2, "a new key must run the side effect again");
    console.log(" [TEST 2] A different Idempotency-Key -> side effect runs again (independent op).");

    // --- TEST 3: no key -> passes through, no dedupe ---
    const res4 = await fetch(`${base}/thing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1 }),
    });
    await res4.json();
    assert(createCount === 3, "a request without a key is never deduped");
    console.log(" [TEST 3] No Idempotency-Key -> passes straight through (web app unaffected).");

    // --- TEST 4: 5xx releases the key so a retry genuinely re-runs ---
    const key3 = randomUUID();
    keysToCleanup.push(key3);
    const boom1 = await fetch(`${base}/boom`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key3 },
      body: JSON.stringify({}),
    });
    await boom1.json();
    assert(boom1.status === 500, "boom should 500");
    const released = await waitForAbsent(key3);
    assert(released, "a 5xx must release the reserved key (not pin the error)");

    const boom2 = await fetch(`${base}/boom`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key3 },
      body: JSON.stringify({}),
    });
    await boom2.json();
    assert(boomCount === 2, "after a 5xx, the same key must be allowed to re-run");
    console.log(" [TEST 4] A 5xx releases the key -> a genuine retry re-runs (transient errors aren't pinned).");

    // --- TEST 5: a 4xx (e.g. expired token) also releases the key ---
    const key4 = randomUUID();
    keysToCleanup.push(key4);
    const forb1 = await fetch(`${base}/forbidden`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key4 },
      body: JSON.stringify({}),
    });
    await forb1.json();
    assert(forb1.status === 403, "forbidden should 403");
    const released4xx = await waitForAbsent(key4);
    assert(released4xx, "a 4xx must release the key (don't strand a queued op on transient auth)");
    const forb2 = await fetch(`${base}/forbidden`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key4 },
      body: JSON.stringify({}),
    });
    await forb2.json();
    assert(forbiddenCount === 2, "after a 4xx, the same key must be allowed to re-run");
    console.log(" [TEST 5] A 4xx releases the key -> a retry can still succeed once auth/deps are ready.");

    console.log("\n==================================================");
    console.log(" ALL IDEMPOTENCY TESTS PASSED!");
    console.log("==================================================");
  } finally {
    await prisma.idempotencyKey.deleteMany({ where: { key: { in: keysToCleanup } } });
    server.close();
  }
}

runTests()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
