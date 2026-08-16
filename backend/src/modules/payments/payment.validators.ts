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

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
export type UpdateInvoiceTaxInput = z.infer<typeof updateInvoiceTaxSchema>;
export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>;
export type RecordCustomerAdvanceInput = z.infer<typeof recordCustomerAdvanceSchema>;
