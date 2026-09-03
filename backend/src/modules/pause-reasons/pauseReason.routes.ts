import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as pauseReasonController from "./pauseReason.controller";

export const pauseReasonRouter = Router();

pauseReasonRouter.use(authMiddleware);

// Read: any authenticated tenant user — a Driver pauses jobs and must see the
// list (not sensitive), same rationale as pricing-methods being ungated.
pauseReasonRouter.get("/", asyncHandler(pauseReasonController.list));
// Create: reuse the equipment/service master-data permission (machine.manage,
// held by Owner/Manager) — same choice transport-types made, no RBAC backfill.
pauseReasonRouter.post("/", requirePermission("machine.manage"), asyncHandler(pauseReasonController.create));
