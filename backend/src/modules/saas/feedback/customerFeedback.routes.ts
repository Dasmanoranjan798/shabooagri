import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { CustomerFeedbackController } from "./customerFeedback.controller";

export const customerFeedbackRouter = Router();
const controller = new CustomerFeedbackController();

customerFeedbackRouter.use(saasAuthMiddleware);

// Customer endpoints
customerFeedbackRouter.post("/", (req, res, next) => controller.submitFeedback(req, res, next));
customerFeedbackRouter.get("/my-feedback", (req, res, next) => controller.getMyFeedback(req, res, next));

// Platform Admin endpoints
customerFeedbackRouter.get("/", requirePlatformAdmin, (req, res, next) => controller.listAllFeedback(req, res, next));
customerFeedbackRouter.patch("/:id", requirePlatformAdmin, (req, res, next) => controller.updateFeedback(req, res, next));
