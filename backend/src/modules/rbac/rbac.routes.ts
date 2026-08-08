import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as rbacController from "./rbac.controller";

export const rbacRouter = Router();

rbacRouter.use(authMiddleware);

rbacRouter.get("/permissions", asyncHandler(rbacController.listPermissions));
rbacRouter.get("/roles", asyncHandler(rbacController.listRoles));
rbacRouter.get("/roles/:id", asyncHandler(rbacController.getRoleById));
rbacRouter.post("/roles", requirePermission("settings.manage"), asyncHandler(rbacController.createRole));
rbacRouter.patch("/roles/:id", requirePermission("settings.manage"), asyncHandler(rbacController.updateRole));
rbacRouter.delete("/roles/:id", requirePermission("settings.manage"), asyncHandler(rbacController.deleteRole));
rbacRouter.post("/users/assign-role", requirePermission("user.manage"), asyncHandler(rbacController.assignUserRole));
