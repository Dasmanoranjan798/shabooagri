import "dotenv/config";
import { z } from "zod";

// Fails fast at boot if required config is missing/malformed, rather than
// surfacing as a runtime error on the first request that needs it.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional().default("support@shabooagri.com"),
  APP_URL: z.string().optional().default("http://localhost:5173"),
  // Customer-facing base URL for emailed auth links (password-reset & staff-invite).
  // The per-tenant operational web app (frontend/) was retired, so these links must
  // target an always-served host — the commercial platform site — which is a
  // registered Android App Link target (an installed app deep-links straight into
  // the Flutter routes) and serves the /reset-password + /accept-invite handoff
  // pages for everyone else. Never a *.shabooagri.com operational URL.
  AUTH_LINK_BASE_URL: z.string().optional().default("https://shabooagri.com"),
  // Base URL of the commercial platform site — used only to build the
  // "Upgrade Plan" redirect link shown when a company hits its machine
  // limit. A plain string, never a live call: if this is wrong or the
  // platform site is down, the link just doesn't work, nothing else here
  // is affected.
  PLATFORM_APP_URL: z.string().optional().default("https://shabooagri.com"),
  // Multi-Provider SMS Gateway Configuration (Fast2SMS, MSG91, Twilio, Mock)
  SMS_PROVIDER: z.enum(["fast2sms", "msg91", "twilio", "mock"]).optional().default("mock"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  SMS_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  // Shared secret the platform backend presents to call
  // /internal/provision-company. Optional at boot (like the SMS/SMTP
  // providers above) so this backend never fails to start over a platform-
  // side concern; modules/internal simply rejects every request with a 503
  // if it's unset, rather than the whole process refusing to boot.
  INTERNAL_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
