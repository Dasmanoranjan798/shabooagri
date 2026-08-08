import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as expenseController from "./expense.controller";

export const expenseRouter = Router();

expenseRouter.use(authMiddleware);

expenseRouter.get("/categories", requirePermission("operations.view"), asyncHandler(expenseController.listCategories));
expenseRouter.get("/", requirePermission("operations.view"), asyncHandler(expenseController.listExpenses));
expenseRouter.get("/:id", requirePermission("operations.view"), asyncHandler(expenseController.getExpenseById));
expenseRouter.post("/", requirePermission("operations.view"), asyncHandler(expenseController.createExpense));
expenseRouter.patch("/:id", requirePermission("operations.view"), asyncHandler(expenseController.updateExpense));
expenseRouter.delete("/:id", requirePermission("operations.view"), asyncHandler(expenseController.removeExpense));
