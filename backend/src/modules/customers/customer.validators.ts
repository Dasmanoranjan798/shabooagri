import { z } from "zod";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  villageId: z.string().uuid(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().optional(),
  // The Manager-facing alternative to delete (§ dependency-locked
  // deletion, Rule 5) — a Customer referenced by any Booking can never be
  // hard-deleted, only marked inactive.
  isActive: z.boolean().optional(),
  isGstApplicable: z.boolean().optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || gstRegex.test(val), {
      message: "Invalid Indian GSTIN format",
    }),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
