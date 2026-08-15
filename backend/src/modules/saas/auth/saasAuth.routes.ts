import { Router } from "express";
import { saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasAuthController } from "./saasAuth.controller";

export const saasAuthRouter = Router();
const controller = new SaasAuthController();

saasAuthRouter.post("/register", (req, res, next) => controller.register(req, res, next));
saasAuthRouter.post("/login", (req, res, next) => controller.login(req, res, next));
saasAuthRouter.post("/sso-exchange", (req, res, next) => controller.exchangeSsoToken(req, res, next));
saasAuthRouter.get("/sso-exchange", (req, res, next) => controller.exchangeSsoToken(req, res, next));

saasAuthRouter.get("/me", saasAuthMiddleware, (req, res, next) => controller.getMe(req, res, next));
saasAuthRouter.post("/change-password", saasAuthMiddleware, (req, res, next) => controller.changePassword(req, res, next));
saasAuthRouter.post("/sso-token", saasAuthMiddleware, (req, res, next) => controller.createSsoToken(req, res, next));
