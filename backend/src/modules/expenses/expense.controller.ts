import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as expenseService from "./expense.service";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validators";

export async function listCategories(req: Request, res: Response) {
  const user = requireUser(req);
  const categories = await expenseService.listCategories(user.companyId);
  res.json(categories);
}

export async function listExpenses(req: Request, res: Response) {
  const user = requireUser(req);
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const machineId = typeof req.query.machineId === "string" ? req.query.machineId : undefined;
  const expenses = await expenseService.listExpenses(user.companyId, { categoryId, machineId });
  res.json(expenses);
}

export async function getExpenseById(req: Request, res: Response) {
  const user = requireUser(req);
  const expense = await expenseService.getExpenseById(user.companyId, req.params.id);
  res.json(expense);
}

export async function createExpense(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createExpenseSchema.parse(req.body);
  const expense = await expenseService.createExpense(user.companyId, user.id, input);
  res.status(201).json(expense);
}

export async function updateExpense(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateExpenseSchema.parse(req.body);
  const expense = await expenseService.updateExpense(user.companyId, req.params.id, input);
  res.json(expense);
}

export async function removeExpense(req: Request, res: Response) {
  const user = requireUser(req);
  await expenseService.deleteExpense(user.companyId, req.params.id);
  res.status(204).send();
}
