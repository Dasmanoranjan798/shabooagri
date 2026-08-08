import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as dashboardController from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get("/summary", asyncHandler(dashboardController.getSummary));
dashboardRouter.get("/income", asyncHandler(dashboardController.getIncomeSeries));
dashboardRouter.get("/fuel", asyncHandler(dashboardController.getFuelSeries));
