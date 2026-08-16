import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as settingsController from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

// Company profile — any authenticated user may read; only owner may write (§6)
settingsRouter.get("/profile", asyncHandler(settingsController.getCompanyProfile));
settingsRouter.patch("/profile", requirePermission("settings.manage"), asyncHandler(settingsController.updateCompanyProfile));

// Terminology labels are read-only in Phase 1 (via /settings/profile) — the
// admin UI + write endpoint to edit them ships in Phase 2 (§9).
