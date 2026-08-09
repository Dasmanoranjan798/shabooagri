import { z } from "zod";

export const createContactEnquirySchema = z.object({
  name: z.string().min(2, "Name is required"),
  businessName: z.string().optional(),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const updateContactEnquirySchema = z.object({
  status: z.enum(["UNREAD", "IN_REVIEW", "RESOLVED"]).optional(),
  responseNotes: z.string().optional(),
  assignedAdminId: z.string().uuid().optional(),
});

export type CreateContactEnquiryInput = z.infer<typeof createContactEnquirySchema>;
export type UpdateContactEnquiryInput = z.infer<typeof updateContactEnquirySchema>;
