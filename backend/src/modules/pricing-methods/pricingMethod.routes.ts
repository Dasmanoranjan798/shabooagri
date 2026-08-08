import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as pricingMethodController from "./pricingMethod.controller";

export const pricingMethodRouter = Router();

// Authenticated only — no requirePermission gate. Unlike the other
// master-data modules, pricing method labels (Per Hour, Per Acre, ...)
// aren't sensitive business data; every role that can see a booking or an
// invoice needs to be able to render the pricing method's label.
pricingMethodRouter.use(authMiddleware);
pricingMethodRouter.get("/", asyncHandler(pricingMethodController.list));
