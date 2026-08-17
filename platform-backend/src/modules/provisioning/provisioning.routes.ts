import { Router } from "express";
import { platformAuthMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as provisioningController from "./provisioning.controller";

export const provisioningRouter = Router();

provisioningRouter.use(platformAuthMiddleware);
provisioningRouter.post("/relaunch", asyncHandler(provisioningController.relaunch));
