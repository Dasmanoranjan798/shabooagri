import { z } from "zod";

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  machineLimit: z.coerce.number().int().positive().optional(),
  priceAnnual: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const updateSiteSettingsSchema = z.object({
  announcementEnabled: z.boolean().optional(),
  announcementMessage: z.string().nullable().optional(),
  purchasingBlocked: z.boolean().optional(),
  extraMachinePrice: z.coerce.number().nonnegative().optional(),
});

export const updateSupportRequestSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
export type UpdateSupportRequestInput = z.infer<typeof updateSupportRequestSchema>;
