import { z } from "zod";

export const issueLicenseSchema = z.object({
  saasUserId: z.string().uuid("Invalid SaaS User ID"),
  companyId: z.string().uuid().optional(),
  status: z.enum([
    "REGISTERED",
    "PAYMENT_PENDING",
    "PAYMENT_VERIFIED",
    "LICENSE_ACTIVE",
    "EXPIRING_SOON",
    "EXPIRED",
    "RENEWED",
  ]).default("LICENSE_ACTIVE"),
  startDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateLicenseStatusSchema = z.object({
  status: z.enum([
    "REGISTERED",
    "PAYMENT_PENDING",
    "PAYMENT_VERIFIED",
    "LICENSE_ACTIVE",
    "EXPIRING_SOON",
    "EXPIRED",
    "RENEWED",
  ]),
  notes: z.string().optional(),
});

export type IssueLicenseInput = z.infer<typeof issueLicenseSchema>;
export type UpdateLicenseStatusInput = z.infer<typeof updateLicenseStatusSchema>;
