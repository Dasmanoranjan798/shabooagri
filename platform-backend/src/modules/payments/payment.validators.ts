import { z } from "zod";

export const createOrderSchema = z.object({
  planKey: z.string().min(1),
  // Extra machine slots on top of the plan's base limit, at the flat
  // per-machine add-on price — independent of which plan is chosen, so a
  // company can both switch tiers and add extras in one purchase.
  extraMachines: z.coerce.number().int().nonnegative().default(0),
  isInterState: z.boolean().optional(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  gatewayPaymentId: z.string().min(1),
  gatewaySignature: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
