import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as reportsController from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(authMiddleware);

// All gated by report.generate (Owner/Manager). Driver self-service does NOT
// go through here — a driver sees their own data via /drivers/:id/earnings.
reportsRouter.get("/drivers", requirePermission("report.generate"), asyncHandler(reportsController.driverReport));
reportsRouter.get("/machines", requirePermission("report.generate"), asyncHandler(reportsController.machineReport));
reportsRouter.get("/machine-maintenance", requirePermission("report.generate"), asyncHandler(reportsController.machineMaintenanceReport));
