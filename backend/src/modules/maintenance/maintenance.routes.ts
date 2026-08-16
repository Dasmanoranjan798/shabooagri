import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as maintenanceController from "./maintenance.controller";

export const maintenanceRouter = Router();

maintenanceRouter.use(authMiddleware);

// Maintenance Schedules
maintenanceRouter.get("/schedules", requirePermission("operations.view"), asyncHandler(maintenanceController.listSchedules));
maintenanceRouter.get("/schedules/:id", requirePermission("operations.view"), asyncHandler(maintenanceController.getScheduleById));
maintenanceRouter.post("/schedules", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.createSchedule));
maintenanceRouter.patch("/schedules/:id", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.updateSchedule));
maintenanceRouter.delete("/schedules/:id", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.removeSchedule));

// Maintenance Records (completed service history)
maintenanceRouter.get("/records", requirePermission("operations.view"), asyncHandler(maintenanceController.listRecords));
maintenanceRouter.get("/records/:id", requirePermission("operations.view"), asyncHandler(maintenanceController.getRecordById));
maintenanceRouter.post("/records", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.createRecord));
maintenanceRouter.patch("/records/:id", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.updateRecord));
maintenanceRouter.delete("/records/:id", requirePermission("maintenance.manage"), asyncHandler(maintenanceController.removeRecord));

// Maintenance Service Alerts
maintenanceRouter.get("/alerts", requirePermission("operations.view"), asyncHandler(maintenanceController.listAlerts));
