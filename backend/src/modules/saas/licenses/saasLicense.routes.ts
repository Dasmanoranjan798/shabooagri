import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasLicenseController } from "./saasLicense.controller";

export const saasLicenseRouter = Router();
const controller = new SaasLicenseController();

saasLicenseRouter.use(saasAuthMiddleware);

// Customer endpoints
saasLicenseRouter.get("/my-license", (req, res, next) => controller.getMyLicense(req, res, next));

// Platform Admin endpoints
saasLicenseRouter.get("/", requirePlatformAdmin, (req, res, next) => controller.listAllLicenses(req, res, next));
saasLicenseRouter.post("/issue", requirePlatformAdmin, (req, res, next) => controller.issueLicense(req, res, next));
saasLicenseRouter.patch("/:id/status", requirePlatformAdmin, (req, res, next) => controller.updateLicenseStatus(req, res, next));
