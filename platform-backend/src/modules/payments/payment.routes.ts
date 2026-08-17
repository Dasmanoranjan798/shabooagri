import { Router } from "express";
import { platformAuthMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as paymentController from "./payment.controller";

export const paymentRouter = Router();

paymentRouter.use(platformAuthMiddleware);
paymentRouter.post("/orders", asyncHandler(paymentController.createOrder));
paymentRouter.post("/verify", asyncHandler(paymentController.verifyPayment));
