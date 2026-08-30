// Tiny pub/sub, deliberately not part of TaskTrayContext's state. A saved
// task (e.g. a Booking form) may finish long after the page that opened it
// has unmounted (the user navigated away while it sat minimized) — a
// directly-stored "onSuccess" callback prop would be a stale closure by
// then. Pages subscribe to a topic instead of receiving a callback, so
// "refresh your list" reaches whichever instance of the page happens to be
// mounted right now, or does nothing if none is.
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function notifyDataRefresh(topic: string): void {
  listeners.get(topic)?.forEach((fn) => fn());
}

export function subscribeDataRefresh(topic: string, fn: Listener): () => void {
  if (!listeners.has(topic)) {
    listeners.set(topic, new Set());
  }
  listeners.get(topic)!.add(fn);
  return () => {
    listeners.get(topic)?.delete(fn);
  };
}

/// Subscribes one listener to several topics at once; returns a single
/// disposer that removes it from all of them.
export function subscribeDataRefreshMany(topics: string[], fn: Listener): () => void {
  const disposers = topics.map((t) => subscribeDataRefresh(t, fn));
  return () => disposers.forEach((d) => d());
}

// ---------------------------------------------------------------------------
// Global real-time synchronization (cascade + automatic, path-driven).
//
// The plain per-topic notify above only refreshes pages subscribed to the one
// topic a modal happened to name — so a booking create that also spawns a job
// and moves the dashboard KPIs left those screens stale, because nobody
// published "jobs"/"dashboard". These helpers fix that: one mutation fans out
// to every topic it actually affects (a dependency cascade, always including
// the dashboard + reports aggregates), and the fan-out is driven automatically
// from the request path in the HTTP layer, so no screen has to remember to
// publish anything.
// ---------------------------------------------------------------------------

/// What each topic's mutation also affects. dashboard + reports are added to
/// every notification separately, since they aggregate all entities.
const CASCADE: Record<string, string[]> = {
  bookings: ["jobs"],
  jobs: ["bookings", "machines", "drivers"],
  invoices: ["customers"],
  machines: ["maintenance"],
  drivers: ["employees"],
  employees: ["drivers", "team"],
  maintenance: ["machines"],
  fuel: ["jobs", "machines"],
  pricingMethods: ["bookings", "jobs"],
};

/// Leading REST path segment -> topic. Keyed to the backend route mounts
/// (backend/src/app.ts). Payment routes (/payments, /invoices/:id/payments)
/// resolve to the "invoices" topic the payment/invoice pages subscribe to.
const SEGMENT_TOPIC: Record<string, string> = {
  bookings: "bookings",
  jobs: "jobs",
  machines: "machines",
  "machine-types": "machines",
  drivers: "drivers",
  customers: "customers",
  villages: "villages",
  employees: "employees",
  payments: "invoices",
  invoices: "invoices",
  maintenance: "maintenance",
  fuel: "fuel",
  expenses: "expenses",
  "pricing-methods": "pricingMethods",
  settings: "settings",
  team: "team",
  rbac: "team",
};

// Topics collected during the current tick, flushed once on a microtask so a
// mutation that triggers both a manual notify and the automatic path notify
// (or several nested writes) refreshes each affected page at most once.
let pending: Set<string> | null = null;

function flushPending(): void {
  const topics = pending;
  pending = null;
  if (!topics) return;
  topics.forEach((t) => notifyDataRefresh(t));
}

/// Expands [topics] through the cascade (+ dashboard/reports) and schedules a
/// batched refresh of every affected page.
export function notifyEntitiesChanged(topics: string[]): void {
  if (topics.length === 0) return;
  if (!pending) {
    pending = new Set();
    queueMicrotask(flushPending);
  }
  pending.add("dashboard");
  pending.add("reports");
  for (const t of topics) {
    pending.add(t);
    for (const dep of CASCADE[t] ?? []) pending.add(dep);
  }
}

/// Parses a request path into affected topics. Any recognized segment counts,
/// so /invoices/:id/payments marks both invoice- and payment-facing pages.
export function topicsForPath(path: string): string[] {
  const out = new Set<string>();
  for (const raw of path.split("/")) {
    const seg = raw.split("?")[0];
    const topic = SEGMENT_TOPIC[seg];
    if (topic) out.add(topic);
  }
  return [...out];
}

/// Called by the HTTP layer after every successful non-GET request. Turns the
/// request path into a cascade-aware refresh. Unrecognized writes still refresh
/// the aggregate dashboard/reports rather than going silently stale.
export function notifyPathChanged(method: string, path: string): void {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
  const topics = topicsForPath(path);
  notifyEntitiesChanged(topics.length ? topics : ["dashboard"]);
}
