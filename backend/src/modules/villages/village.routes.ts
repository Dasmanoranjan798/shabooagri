import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as villageController from "./village.controller";

export const villageRouter = Router();

villageRouter.use(authMiddleware);

villageRouter.get("/", requirePermission("operations.view"), asyncHandler(villageController.list));
villageRouter.get("/:id", requirePermission("operations.view"), asyncHandler(villageController.getById));
villageRouter.post("/", requirePermission("village.manage"), asyncHandler(villageController.create));
villageRouter.patch("/:id", requirePermission("village.manage"), asyncHandler(villageController.update));
villageRouter.delete("/:id", requirePermission("village.manage"), asyncHandler(villageController.remove));
