import { z } from "zod";

export const updateCompanyProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  logoUrl: z.string().url().optional().nullable(),
  themeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "themeColor must be a hex color e.g. #1B7A3E")
    .optional()
    .nullable(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "accentColor must be a hex color")
    .optional()
    .nullable(),
  currency: z.string().length(3, "currency must be a 3-letter ISO code").optional(),
  timezone: z.string().min(1).max(80).optional(),
  language: z.string().min(2).max(10).optional(),
  invoicePrefix: z.string().trim().max(10).optional().nullable(),
});

const terminologyEntrySchema = z.object({
  termKey: z.enum(["customer", "driver", "machine", "booking", "invoice", "village"]),
  displayLabelSingular: z.string().trim().min(1).max(100),
  displayLabelPlural: z.string().trim().min(1).max(100),
});

export const updateTerminologySchema = z.object({
  terms: z.array(terminologyEntrySchema).min(1).max(20),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type UpdateTerminologyInput = z.infer<typeof updateTerminologySchema>;
