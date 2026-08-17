import { Router } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as plansController from "./plans.controller";

export const plansRouter = Router();

plansRouter.get("/config", asyncHandler(plansController.getPublicConfig));
