import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as customerController from "./customer.controller";

export const customerRouter = Router();

customerRouter.use(authMiddleware);

customerRouter.get("/", requirePermission("operations.view"), asyncHandler(customerController.list));
// Must precede "/:id" so "villages" is not captured as an id path param.
customerRouter.get("/villages", requirePermission("operations.view"), asyncHandler(customerController.listVillages));
customerRouter.get("/:id", requirePermission("operations.view"), asyncHandler(customerController.getById));
customerRouter.post("/", requirePermission("customer.manage"), asyncHandler(customerController.create));
customerRouter.patch("/:id", requirePermission("customer.manage"), asyncHandler(customerController.update));
// Owner-only (§ dependency-locked deletion, Rule 4 & 5) — distinct from
// customer.manage, which a Manager holds for create/edit/deactivate.
customerRouter.delete("/:id", requirePermission("customer.delete"), asyncHandler(customerController.remove));
