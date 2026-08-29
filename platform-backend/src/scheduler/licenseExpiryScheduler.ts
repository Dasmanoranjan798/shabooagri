import { env } from "../config/env";
import { sweepExpiredLicenses } from "../modules/licenses/license.service";

// §P2-7 — runs the license-expiry sweep on the app lifecycle.
//
// In-process interval timer (no new scheduling dependency, matching this
// backend's minimal-infra approach). Design notes:
// - Singleton: a module-level guard prevents a second timer if start() is ever
//   called twice.
// - .unref(): the timer never keeps the process alive, so shutdown stays clean
//   and no explicit SIGTERM handler is needed.
// - Fail-safe: a sweep error is logged and swallowed — a transient DB blip must
//   not crash the platform API. It simply retries on the next tick.
// - Runs once shortly after boot, then every LICENSE_EXPIRY_SWEEP_INTERVAL_MINUTES.

let timer: NodeJS.Timeout | null = null;

async function runSweep(): Promise<void> {
  try {
    const count = await sweepExpiredLicenses();
    if (count > 0) {
      console.log(`[LicenseExpiry] Swept ${count} license(s) past expiry -> EXPIRED.`);
    }
  } catch (err: any) {
    // Never throw from the scheduled task — log and let the next tick retry.
    console.error("[LicenseExpiry] Sweep failed:", err?.message || err);
  }
}

export function startLicenseExpiryScheduler(): void {
  if (env.LICENSE_EXPIRY_SWEEP_ENABLED === "false") {
    console.log("[LicenseExpiry] Scheduler disabled (LICENSE_EXPIRY_SWEEP_ENABLED=false).");
    return;
  }
  if (timer) {
    // Already started — never create a second timer.
    return;
  }
  const intervalMs = env.LICENSE_EXPIRY_SWEEP_INTERVAL_MINUTES * 60 * 1000;
  console.log(
    `[LicenseExpiry] Scheduler started (every ${env.LICENSE_EXPIRY_SWEEP_INTERVAL_MINUTES} min).`,
  );
  // Run once shortly after boot so a just-lapsed license is enforced promptly,
  // then on the fixed interval.
  void runSweep();
  timer = setInterval(() => void runSweep(), intervalMs);
  timer.unref();
}

// Exposed for clean teardown (e.g. tests); no-op if not running.
export function stopLicenseExpiryScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
