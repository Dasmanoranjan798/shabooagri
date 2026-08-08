import { z } from "zod";

export const receivePaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CREDIT"]),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
