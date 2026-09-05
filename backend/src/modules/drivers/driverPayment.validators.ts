import { z } from "zod";

export const recordDriverPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CREDIT"]),
  referenceNumber: z.string().trim().optional(),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  notes: z.string().trim().optional(),
});

export const cancelDriverPaymentSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to cancel this"),
});

export type RecordDriverPaymentInput = z.infer<typeof recordDriverPaymentSchema>;
