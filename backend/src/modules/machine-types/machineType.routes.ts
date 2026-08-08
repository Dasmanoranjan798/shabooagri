import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as machineTypeController from "./machineType.controller";

export const machineTypeRouter = Router();

machineTypeRouter.use(authMiddleware);

machineTypeRouter.get("/", requirePermission("operations.view"), asyncHandler(machineTypeController.list));
machineTypeRouter.get("/:id", requirePermission("operations.view"), asyncHandler(machineTypeController.getById));
machineTypeRouter.post("/", requirePermission("machine_type.manage"), asyncHandler(machineTypeController.create));
machineTypeRouter.patch("/:id", requirePermission("machine_type.manage"), asyncHandler(machineTypeController.update));
machineTypeRouter.delete("/:id", requirePermission("machine_type.manage"), asyncHandler(machineTypeController.remove));
