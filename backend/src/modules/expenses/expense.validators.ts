import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  machineId: z.string().uuid().optional(),
  amount: z.number().positive("Expense amount must be greater than zero"),
  description: z.string().optional(),
  expenseDate: z.coerce.date().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
