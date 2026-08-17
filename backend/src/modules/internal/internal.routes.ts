import { Router } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as internalController from "./internal.controller";

// Mounted in app.ts BEFORE tenantResolverMiddleware and without
// authMiddleware — see internalApiKey.middleware.ts and app.ts for why.
// This router has exactly one caller: the platform backend.
export const internalRouter = Router();

internalRouter.post("/provision-company", asyncHandler(internalController.provisionCompany));
