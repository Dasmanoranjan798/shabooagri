import { z } from "zod";

export const saasRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name is required"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
});

export const saasLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const saasChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const saasForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const saasVerifyResetTokenSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Reset token is required"),
});

export const saasResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type SaasRegisterInput = z.infer<typeof saasRegisterSchema>;
export type SaasLoginInput = z.infer<typeof saasLoginSchema>;
export type SaasChangePasswordInput = z.infer<typeof saasChangePasswordSchema>;
export type SaasForgotPasswordInput = z.infer<typeof saasForgotPasswordSchema>;
export type SaasVerifyResetTokenInput = z.infer<typeof saasVerifyResetTokenSchema>;
export type SaasResetPasswordInput = z.infer<typeof saasResetPasswordSchema>;
