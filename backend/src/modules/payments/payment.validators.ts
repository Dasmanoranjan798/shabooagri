import { z } from "zod";

export const receivePaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CREDIT"]),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const updateInvoiceTaxSchema = z.object({
  isGstApplicable: z.boolean(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const createManualInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  totalAmount: z.number().positive("Invoice amount must be greater than zero"),
  description: z.string().trim().min(1, "Please describe what this invoice is for"),
  dueDate: z.string().optional(),
});

export const recordCustomerAdvanceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive("Advance amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CREDIT"]),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// § dependency-locked deletion, Rule 1: void reason is mandatory, never
// just a nicety — it's what makes the permanent "Voided" history entry
// meaningful.
export const voidSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to void this"),
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
export type UpdateInvoiceTaxInput = z.infer<typeof updateInvoiceTaxSchema>;
export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>;
export type RecordCustomerAdvanceInput = z.infer<typeof recordCustomerAdvanceSchema>;
export type VoidInput = z.infer<typeof voidSchema>;
