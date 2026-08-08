export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
}

export interface Expense {
  id: string;
  companyId: string;
  categoryId: string;
  machineId?: string | null;
  amount: number;
  description?: string | null;
  incurredBy: string;
  expenseDate: string;
  createdAt: string;
  category?: ExpenseCategory;
  machine?: {
    id: string;
    registrationNumber: string;
    brand?: string | null;
    model?: string | null;
  } | null;
  incurredByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface CreateExpensePayload {
  categoryId: string;
  machineId?: string;
  amount: number;
  description?: string;
  expenseDate?: string;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {}
