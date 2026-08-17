import { Router } from "express";
import { platformAuthMiddleware } from "../../middleware/auth.middleware";
import { platformAdminMiddleware } from "../../middleware/platformAdmin.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as adminController from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(platformAuthMiddleware, platformAdminMiddleware);

adminRouter.get("/dashboard", asyncHandler(adminController.getDashboard));
adminRouter.get("/plans", asyncHandler(adminController.listPlans));
adminRouter.patch("/plans/:key", asyncHandler(adminController.updatePlan));
adminRouter.get("/site-settings", asyncHandler(adminController.getSiteSettings));
adminRouter.patch("/site-settings", asyncHandler(adminController.updateSiteSettings));
adminRouter.get("/feedback", asyncHandler(adminController.listFeedback));
adminRouter.get("/support-requests", asyncHandler(adminController.listSupportRequests));
adminRouter.patch("/support-requests/:id", asyncHandler(adminController.updateSupportRequest));
