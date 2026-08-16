import { Router } from "express";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasAuthController } from "./saasAuth.controller";

export const saasAuthRouter = Router();
const controller = new SaasAuthController();
const resetRateLimiter = createRateLimiter(15 * 60 * 1000, 5);

saasAuthRouter.post("/register", (req, res, next) => controller.register(req, res, next));
saasAuthRouter.post("/login", (req, res, next) => controller.login(req, res, next));
saasAuthRouter.post("/forgot-password", resetRateLimiter, (req, res, next) => controller.forgotPassword(req, res, next));
saasAuthRouter.post("/verify-reset-token", (req, res, next) => controller.verifyResetToken(req, res, next));
saasAuthRouter.post("/reset-password", (req, res, next) => controller.resetPassword(req, res, next));
saasAuthRouter.post("/sso-exchange", (req, res, next) => controller.exchangeSsoToken(req, res, next));
saasAuthRouter.get("/sso-exchange", (req, res, next) => controller.exchangeSsoToken(req, res, next));

saasAuthRouter.get("/me", saasAuthMiddleware, (req, res, next) => controller.getMe(req, res, next));
saasAuthRouter.post("/change-password", saasAuthMiddleware, (req, res, next) => controller.changePassword(req, res, next));
saasAuthRouter.post("/sso-token", saasAuthMiddleware, (req, res, next) => controller.createSsoToken(req, res, next));
