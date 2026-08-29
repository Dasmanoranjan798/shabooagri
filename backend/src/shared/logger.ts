import { env } from "../config/env";

// Centralized structured logger for the operational backend.
//
// Why this exists: production logging was scattered ad-hoc console.* calls with
// no structure, no severity discipline, and — critically — some lines wrote
// authentication secrets (OTP codes, invite tokens) straight to the log. This
// is the single place log lines are formatted, so every event is structured
// (JSON, one object per line — greppable/ingestible by PM2 and any log
// shipper) and every payload is passed through redaction before it is written.
//
// No external service and no logging dependency: the process runs under PM2
// which already captures stdout/stderr, so emitting JSON lines there is the
// smallest safe design. stderr is used for error level, stdout otherwise.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
// Suppress debug in production; everything info+ is emitted.
const MIN_LEVEL: number = env.NODE_ENV === "production" ? LEVEL_ORDER.info : LEVEL_ORDER.debug;

const SERVICE = "shabooagri-backend";
const REDACTED = "[REDACTED]";

// Key names whose VALUES must never appear in a log, matched case-insensitively.
// "code" is deliberately NOT here: it collides with useful non-secret fields
// (Prisma error `code`, HTTP status codes). OTP codes are kept out of logs at
// the source (they are never passed into the logger) rather than relying on a
// broad "code" match that would also blank out diagnostics.
const SENSITIVE_SUBSTRINGS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "signature",
  "apikey",
  "api_key",
  "databaseurl",
  "database_url",
];
const SENSITIVE_EXACT = new Set(["pin", "otp", "otpcode", "pinhash", "passwordhash", "codehash", "auth"]);

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  if (SENSITIVE_EXACT.has(k)) return true;
  return SENSITIVE_SUBSTRINGS.some((s) => k.includes(s));
}

// Serializes an Error into safe, useful fields only (name/message/code/stack) —
// never spreads arbitrary enumerable props that might carry secrets.
function serializeError(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { message: String(err) };
  }
  const out: Record<string, unknown> = { name: err.name, message: err.message };
  const code = (err as { code?: unknown }).code;
  if (code !== undefined) out.code = code;
  // Prisma known-request errors carry meta.target (column names — safe, useful).
  const meta = (err as { meta?: { target?: unknown } }).meta;
  if (meta && typeof meta === "object" && "target" in meta) out.metaTarget = (meta as { target?: unknown }).target;
  if (err.stack) out.stack = err.stack;
  return out;
}

// Deep-redacts a value: any object key whose name looks sensitive has its value
// replaced with [REDACTED]; Error values are turned into safe error fields.
function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== "object" || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveKey(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    env: env.NODE_ENV,
    msg,
  };
  if (meta) {
    // `err` gets first-class treatment; everything else is redacted metadata.
    const { err, ...rest } = meta;
    if (err !== undefined) entry.err = serializeError(err);
    const safeRest = redact(rest) as Record<string, unknown>;
    for (const [k, v] of Object.entries(safeRest)) entry[k] = v;
  }
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
  // Returns a logger whose calls always include the given base context
  // (e.g. { requestId, companyId }). Used by the request logger so every line
  // for a request is correlatable.
  child(base: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, { ...base, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, { ...base, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, { ...base, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, { ...base, ...meta }),
    };
  },
};

// Exposed for unit testing of the redaction rules.
export const __testing = { redact, isSensitiveKey, serializeError };
