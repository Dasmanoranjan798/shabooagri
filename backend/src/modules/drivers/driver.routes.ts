import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as driverController from "./driver.controller";

export const driverRouter = Router();

driverRouter.use(authMiddleware);

driverRouter.get("/", requirePermission("operations.view"), asyncHandler(driverController.list));
driverRouter.get("/:id", requirePermission("operations.view"), asyncHandler(driverController.getById));
// No requirePermission gate: a Driver may view their own compensation
// summary. driver.service resolves the caller's scope (any driver for
// Owner/Manager via operations.view, only their own record for a Driver)
// rather than a route-level permission check — same pattern as Bookings.
driverRouter.get("/:id/compensation", asyncHandler(driverController.getCompensationSummary));
driverRouter.post("/", requirePermission("driver.manage"), asyncHandler(driverController.create));
driverRouter.patch("/:id", requirePermission("driver.manage"), asyncHandler(driverController.update));
driverRouter.delete("/:id", requirePermission("driver.manage"), asyncHandler(driverController.remove));
