import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as employeeController from "./employee.controller";

export const employeeRouter = Router();

employeeRouter.use(authMiddleware);

employeeRouter.get("/", requirePermission("operations.view"), asyncHandler(employeeController.list));
employeeRouter.get("/:id", requirePermission("operations.view"), asyncHandler(employeeController.getById));
employeeRouter.post("/", requirePermission("employee.manage"), asyncHandler(employeeController.create));
employeeRouter.patch("/:id", requirePermission("employee.manage"), asyncHandler(employeeController.update));
// Owner-only (§ dependency-locked deletion, Rule 4 & 5) — distinct from
// employee.manage, which a Manager holds for create/edit/deactivate.
employeeRouter.delete("/:id", requirePermission("employee.delete"), asyncHandler(employeeController.remove));
