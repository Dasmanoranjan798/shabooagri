import { z } from "zod";

export const recordSaasPaymentSchema = z.object({
  saasUserId: z.string().uuid("Invalid SaaS User ID"),
  licenseId: z.string().uuid().optional(),
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  gatewaySignature: z.string().optional(),
  paymentReference: z.string().optional(),
  isInterState: z.boolean().default(false),
  paymentMethod: z.string().optional().default("UPI"),
  gatewayPayload: z.record(z.any()).optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).default("SUCCESS"),
});

export type RecordSaasPaymentInput = z.infer<typeof recordSaasPaymentSchema>;
