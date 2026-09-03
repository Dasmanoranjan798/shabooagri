import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as transportTypeController from "./transportType.controller";

export const transportTypeRouter = Router();

transportTypeRouter.use(authMiddleware);

// Read gated like other operational master data. Management reuses the
// existing equipment/service master-data permission (machine.manage, held by
// Owner/Manager) — no new permission, no RBAC backfill for existing companies.
transportTypeRouter.get("/", requirePermission("operations.view"), asyncHandler(transportTypeController.list));
transportTypeRouter.post("/", requirePermission("machine.manage"), asyncHandler(transportTypeController.create));
