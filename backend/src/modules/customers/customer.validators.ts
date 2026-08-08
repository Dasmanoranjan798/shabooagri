import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  villageId: z.string().uuid(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
