import { z } from "zod";

export const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required").max(5000),
});

export const supportRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(300),
  message: z.string().min(1, "Message is required").max(5000),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
