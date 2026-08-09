import { z } from "zod";

export const createFeedbackSchema = z.object({
  companyId: z.string().uuid().optional(),
  category: z.string().min(2, "Category is required"), // e.g., FEATURE_REQUEST, BUG_REPORT, GENERAL
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(["SUBMITTED", "IN_REVIEW", "PLANNED", "RESOLVED", "CLOSED"]).optional(),
  adminNotes: z.string().optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
