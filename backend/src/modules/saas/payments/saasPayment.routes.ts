import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasPaymentController } from "./saasPayment.controller";

export const saasPaymentRouter = Router();
const controller = new SaasPaymentController();

// Unauthenticated Webhook endpoint for Payment Gateways
saasPaymentRouter.post("/webhook", (req, res, next) => controller.handleWebhook(req, res, next));

// Authenticated Customer endpoints
saasPaymentRouter.use(saasAuthMiddleware);

saasPaymentRouter.get("/my-payments", (req, res, next) => controller.getMyPayments(req, res, next));
saasPaymentRouter.post("/create-order", (req, res, next) => controller.createOrder(req, res, next));
saasPaymentRouter.post("/verify-payment", (req, res, next) => controller.verifyPayment(req, res, next));

// Platform Admin endpoints
saasPaymentRouter.get("/", requirePlatformAdmin, (req, res, next) => controller.listAllPayments(req, res, next));
saasPaymentRouter.post("/record", requirePlatformAdmin, (req, res, next) => controller.recordPayment(req, res, next));
