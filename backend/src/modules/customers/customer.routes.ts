import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as customerController from "./customer.controller";

export const customerRouter = Router();

customerRouter.use(authMiddleware);

customerRouter.get("/", requirePermission("operations.view"), asyncHandler(customerController.list));
customerRouter.get("/:id", requirePermission("operations.view"), asyncHandler(customerController.getById));
customerRouter.post("/", requirePermission("customer.manage"), asyncHandler(customerController.create));
customerRouter.patch("/:id", requirePermission("customer.manage"), asyncHandler(customerController.update));
customerRouter.delete("/:id", requirePermission("customer.manage"), asyncHandler(customerController.remove));
