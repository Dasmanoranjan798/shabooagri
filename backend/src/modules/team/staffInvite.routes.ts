import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as staffInviteController from "./staffInvite.controller";

export const teamRouter = Router();

teamRouter.use(authMiddleware);

teamRouter.get("/invites", requirePermission("user.manage"), asyncHandler(staffInviteController.list));
teamRouter.post("/invites", requirePermission("user.manage"), asyncHandler(staffInviteController.create));
teamRouter.patch(
  "/invites/:id/revoke",
  requirePermission("user.manage"),
  asyncHandler(staffInviteController.revoke),
);

teamRouter.get("/users", requirePermission("user.manage"), asyncHandler(staffInviteController.listUsers));
teamRouter.patch(
  "/users/:id/status",
  requirePermission("user.manage"),
  asyncHandler(staffInviteController.setUserStatus),
);
