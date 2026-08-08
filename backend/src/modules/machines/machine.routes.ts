import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as machineController from "./machine.controller";

export const machineRouter = Router();

machineRouter.use(authMiddleware);

machineRouter.get("/", requirePermission("operations.view"), asyncHandler(machineController.list));
machineRouter.get("/:id", requirePermission("operations.view"), asyncHandler(machineController.getById));
machineRouter.post("/", requirePermission("machine.manage"), asyncHandler(machineController.create));
machineRouter.patch("/:id", requirePermission("machine.manage"), asyncHandler(machineController.update));
machineRouter.delete("/:id", requirePermission("machine.manage"), asyncHandler(machineController.remove));
