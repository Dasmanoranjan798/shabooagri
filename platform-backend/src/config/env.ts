import "dotenv/config";
import { z } from "zod";

// Fails fast at boot if required config is missing/malformed. Notably: no
// Razorpay keys required here — the payments module falls back to a stub
// order id when they're absent, same lesson learned as the operational
// backend no longer hard-requiring them.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4010),
  PLATFORM_DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  INTERNAL_API_KEY: z.string().min(1),
  OPERATIONAL_API_URL: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Used to build password-reset links. Unlike the operational backend,
  // this app has no per-tenant subdomain concept — every platform account
  // resets its password at the same bare-domain URL.
  PLATFORM_APP_URL: z.string().default("https://shabooagri.com"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Mailbox that receives Feedback/Support Request notifications. Falls
  // back to SMTP_USER (the support mailbox itself) when unset, so no extra
  // config is required in the common case of sending-to-self.
  SUPPORT_NOTIFY_EMAIL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
