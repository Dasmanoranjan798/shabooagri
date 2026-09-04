import { z } from "zod";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createCustomerSchema = z.object({
  // Client-authoritative offline id (see villages validator); optional + UUID.
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  // Address is part of the person now (the standalone Village master was
  // retired). `village` is the locality; the rest complete a full address.
  // All optional so a farmer can be saved with only the detail that is known.
  village: z.string().trim().optional(),
  postOffice: z.string().trim().optional(),
  block: z.string().trim().optional(),
  district: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pin: z.string().trim().optional(),
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
