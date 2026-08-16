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
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  // Only needed once a webhook is registered in the Razorpay Dashboard; the
  // synchronous checkout-verification flow works without it.
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Multi-Provider SMS Gateway Configuration (Fast2SMS, MSG91, Twilio, Mock)
  SMS_PROVIDER: z.enum(["fast2sms", "msg91", "twilio", "mock"]).optional().default("mock"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  SMS_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

export const env = envSchema.parse(process.env);
