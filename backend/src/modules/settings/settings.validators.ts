import { z } from "zod";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const pinRegex = /^[1-9][0-9]{5}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Logo/theme-color/accent-color and currency/timezone/language are
// white-label fields — Phase 1 leaves them schema-driven with sensible
// defaults but not editable via this endpoint (§10: schema now, UI in
// Phase 2). Only fields a Phase 1 CHC actually needs to configure day one
// (identity, tax numbers, bank/UPI details, alert thresholds) are writable.
export const updateCompanyProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  invoicePrefix: z.string().trim().max(10).optional().nullable(),

  // Phase B Business Identity fields
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || pinRegex.test(val), {
      message: "Invalid Indian postal PIN code format (must be 6 digits)",
    }),
  country: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Invalid official email format",
    }),
  isGstRegistered: z.boolean().optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || gstRegex.test(val), {
      message: "Invalid Indian GSTIN format (15 alphanumeric characters)",
    }),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || panRegex.test(val), {
      message: "Invalid Indian PAN format (10 alphanumeric characters)",
    }),

  // Phase B Bank & Payment Details
  bankName: z.string().trim().max(100).optional().nullable(),
  accountNumber: z.string().trim().max(50).optional().nullable(),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || ifscRegex.test(val), {
      message: "Invalid IFSC code format (e.g. SBIN0001234)",
    }),
  upiId: z.string().trim().max(100).optional().nullable(),

  // Phase B Tax Defaults
  defaultTaxRate: z.number().min(0).max(100).optional().nullable(),
  taxInclusive: z.boolean().optional(),

  // Phase C Equipment & Operational Rules
  serviceAlertHours: z.number().int().min(0).max(10000).optional(),
  insuranceAlertDays: z.number().int().min(0).max(365).optional(),
  licenseAlertDays: z.number().int().min(0).max(365).optional(),
  requireJobPhoto: z.boolean().optional(),
  requireJobFuelLog: z.boolean().optional(),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
