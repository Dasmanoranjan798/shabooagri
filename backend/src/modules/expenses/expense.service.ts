import { AppError } from "../../shared/errors/AppError";
import * as machineService from "../machines/machine.service";
import * as expenseRepo from "./expense.repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expense.validators";

const DEFAULT_CATEGORIES = [
  "Fuel & Oil",
  "Spare Parts & Repairs",
  "Driver & Operator Allowance",
  "Tooling & Maintenance",
  "Office & Administrative",
  "Miscellaneous",
];

export async function listCategories(companyId: string) {
  let categories = await expenseRepo.findAllCategories(companyId);
  if (categories.length === 0) {
    // Seed default categories if none exist for company
    for (const name of DEFAULT_CATEGORIES) {
      await expenseRepo.createCategory(companyId, name);
    }
    categories = await expenseRepo.findAllCategories(companyId);
  }
  return categories;
}

export async function listExpenses(companyId: string, filter: { categoryId?: string; machineId?: string } = {}) {
  return expenseRepo.findAllForCompany(companyId, filter);
}

export async function getExpenseById(companyId: string, id: string) {
  const expense = await expenseRepo.findByIdScopedWithRelations(companyId, id);
  if (!expense) throw new AppError(404, "Expense record not found");
  return expense;
}

export async function createExpense(companyId: string, userId: string, input: CreateExpenseInput) {
  const category = await expenseRepo.findCategoryByIdScoped(companyId, input.categoryId);
  if (!category) throw new AppError(404, "Expense category not found");

  if (input.machineId) {
    await machineService.getById(companyId, input.machineId);
  }

  return expenseRepo.create(companyId, userId, {
    categoryId: input.categoryId,
    machineId: input.machineId || null,
    amount: input.amount,
    description: input.description || null,
    expenseDate: input.expenseDate || new Date(),
  });
}

export async function updateExpense(companyId: string, id: string, input: UpdateExpenseInput) {
  await getExpenseById(companyId, id);

  if (input.categoryId) {
    const category = await expenseRepo.findCategoryByIdScoped(companyId, input.categoryId);
    if (!category) throw new AppError(404, "Expense category not found");
  }

  if (input.machineId) {
    await machineService.getById(companyId, input.machineId);
  }

  return expenseRepo.updateScoped(companyId, id, {
    categoryId: input.categoryId,
    machineId: input.machineId,
    amount: input.amount,
    description: input.description,
    expenseDate: input.expenseDate,
  });
}

export async function deleteExpense(companyId: string, id: string) {
  await getExpenseById(companyId, id);
  return expenseRepo.deleteScoped(companyId, id);
}
