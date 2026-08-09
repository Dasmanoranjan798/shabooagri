import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasAdminController } from "./saasAdmin.controller";

export const saasAdminRouter = Router();
const controller = new SaasAdminController();

saasAdminRouter.use(saasAuthMiddleware, requirePlatformAdmin);

saasAdminRouter.get("/dashboard", (req, res, next) => controller.getDashboardMetrics(req, res, next));
saasAdminRouter.get("/customers", (req, res, next) => controller.listCustomers(req, res, next));
saasAdminRouter.get("/licenses", (req, res, next) => controller.listLicenses(req, res, next));
saasAdminRouter.post("/licenses/extend", (req, res, next) => controller.extendLicense(req, res, next));
saasAdminRouter.get("/payments", (req, res, next) => controller.listPayments(req, res, next));
saasAdminRouter.get("/leads", (req, res, next) => controller.listLeads(req, res, next));
saasAdminRouter.patch("/leads/:id", (req, res, next) => controller.updateLeadStatus(req, res, next));
saasAdminRouter.get("/enquiries", (req, res, next) => controller.listEnquiries(req, res, next));
saasAdminRouter.patch("/enquiries/:id", (req, res, next) => controller.updateEnquiryStatus(req, res, next));
saasAdminRouter.get("/feedback", (req, res, next) => controller.listFeedback(req, res, next));
saasAdminRouter.patch("/feedback/:id", (req, res, next) => controller.updateFeedbackStatus(req, res, next));
