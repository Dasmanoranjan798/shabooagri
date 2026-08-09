import { Router } from "express";
import { requirePlatformAdmin, saasAuthMiddleware } from "../middleware/saasAuth.middleware";
import { ContactEnquiryController } from "./contactEnquiry.controller";

export const contactEnquiryRouter = Router();
const controller = new ContactEnquiryController();

// Public submission
contactEnquiryRouter.post("/", (req, res, next) => controller.submitEnquiry(req, res, next));

// Platform Admin management
contactEnquiryRouter.get("/", saasAuthMiddleware, requirePlatformAdmin, (req, res, next) => controller.listEnquiries(req, res, next));
contactEnquiryRouter.patch("/:id", saasAuthMiddleware, requirePlatformAdmin, (req, res, next) => controller.updateEnquiry(req, res, next));
