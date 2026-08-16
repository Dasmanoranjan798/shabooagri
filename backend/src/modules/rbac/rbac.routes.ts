import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as rbacController from "./rbac.controller";

// Phase 1 ships 4 fixed roles with hardcoded permission sets (§6) — only
// read access is exposed here. Custom role creation/editing and arbitrary
// role reassignment are Phase 2 (full RBAC, §2) and are not implemented.
export const rbacRouter = Router();

rbacRouter.use(authMiddleware);

rbacRouter.get("/permissions", asyncHandler(rbacController.listPermissions));
rbacRouter.get("/roles", asyncHandler(rbacController.listRoles));
rbacRouter.get("/roles/:id", asyncHandler(rbacController.getRoleById));
