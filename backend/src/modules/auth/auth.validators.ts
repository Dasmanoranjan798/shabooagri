import { z } from "zod";

// One schema per endpoint payload. Controllers parse against these and
// never accept a request body without validating it first.

export const registerSchema = z
  .object({
    fullName: z.string().min(1),
    roleKey: z.enum(["owner", "manager", "driver", "farmer"]),
    email: z.string().email().optional(),
    mobileNumber: z.string().min(6).optional(),
    password: z.string().min(8).optional(),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
      .optional(),
  })
  .refine((data) => data.email || data.mobileNumber, {
    message: "At least one of email or mobileNumber is required",
    path: ["email"],
  });

export const otpRequestSchema = z.object({
  identifier: z.string().min(1),
});

export const otpVerifySchema = z.object({
  identifier: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "OTP code must be 6 digits"),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const pinLoginSchema = z.object({
  identifier: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyPasswordResetTokenSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Token is required"),
});

export const confirmPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type PinLoginInput = z.infer<typeof pinLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type VerifyPasswordResetTokenInput = z.infer<typeof verifyPasswordResetTokenSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;

