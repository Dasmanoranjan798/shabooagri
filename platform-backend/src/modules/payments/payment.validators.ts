import { z } from "zod";

export const createOrderSchema = z.object({
  isInterState: z.boolean().optional(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  gatewayPaymentId: z.string().min(1),
  gatewaySignature: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
