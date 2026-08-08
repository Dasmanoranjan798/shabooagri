import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as driverController from "./driver.controller";

export const driverRouter = Router();

driverRouter.use(authMiddleware);

driverRouter.get("/", requirePermission("operations.view"), asyncHandler(driverController.list));
driverRouter.get("/:id", requirePermission("operations.view"), asyncHandler(driverController.getById));
driverRouter.post("/", requirePermission("driver.manage"), asyncHandler(driverController.create));
driverRouter.patch("/:id", requirePermission("driver.manage"), asyncHandler(driverController.update));
driverRouter.delete("/:id", requirePermission("driver.manage"), asyncHandler(driverController.remove));
