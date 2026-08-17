import { z } from "zod";

export const provisionCompanySchema = z.object({
  platformUserId: z.string().min(1),
  businessName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  planKey: z.string().min(1),
  machineLimit: z.number().int().nonnegative(),
});

export const updatePlanSchema = z.object({
  platformUserId: z.string().min(1),
  planKey: z.string().min(1),
  machineLimit: z.number().int().nonnegative(),
});

export type ProvisionCompanyInput = z.infer<typeof provisionCompanySchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
