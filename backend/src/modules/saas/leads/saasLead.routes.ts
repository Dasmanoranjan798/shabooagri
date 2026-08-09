import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { SaasLeadController } from "./saasLead.controller";

export const saasLeadRouter = Router();
const controller = new SaasLeadController();

// Public lead submission
saasLeadRouter.post("/", (req, res, next) => controller.createLead(req, res, next));

// Platform Admin lead management
saasLeadRouter.get("/", saasAuthMiddleware, requirePlatformAdmin, (req, res, next) => controller.listLeads(req, res, next));
saasLeadRouter.patch("/:id", saasAuthMiddleware, requirePlatformAdmin, (req, res, next) => controller.updateLead(req, res, next));
