import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  businessName: z.string().optional(),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email address").optional(),
  source: z.string().optional().default("WEBSITE"),
});

export const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "IN_CONVERSATION", "CONVERTED", "CLOSED"]).optional(),
  followUpNotes: z.string().optional(),
  assignedAdminId: z.string().uuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
