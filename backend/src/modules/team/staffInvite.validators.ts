import { z } from "zod";

export const createInviteSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    roleId: z.string().uuid("Invalid role"),
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().min(6, "Invalid phone number").optional(),
    villageId: z.string().uuid("Invalid village").optional(),
    // Set when inviting someone who already has an Employee HR record
    // (e.g. from the Employees page) — accept links to it instead of
    // creating a new Employee.
    employeeId: z.string().uuid("Invalid employee").optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "At least one of email or phone is required",
    path: ["email"],
  });

export const verifyInviteTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const setUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type VerifyInviteTokenInput = z.infer<typeof verifyInviteTokenSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
