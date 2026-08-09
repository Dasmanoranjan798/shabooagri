import { Router } from "express";
import { saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasCustomerController } from "./saasCustomer.controller";

export const saasCustomerRouter = Router();
const controller = new SaasCustomerController();

saasCustomerRouter.use(saasAuthMiddleware);
saasCustomerRouter.get("/profile", (req, res, next) => controller.getProfile(req, res, next));
saasCustomerRouter.put("/profile", (req, res, next) => controller.updateProfile(req, res, next));
