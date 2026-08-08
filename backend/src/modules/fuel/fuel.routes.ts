import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as fuelController from "./fuel.controller";

// Company-wide fuel route. Job-scoped fuel CRUD lives on the Jobs router
// (POST/GET /jobs/:id/fuel-entries) — that's the write path. This route is
// a read-only view of all fuel records across a company, used by the Fuel
// Tracking listing page. See fuel module README for rationale.
export const fuelRouter = Router();

fuelRouter.use(authMiddleware);

fuelRouter.get("/entries", requirePermission("operations.view"), asyncHandler(fuelController.listFuelEntries));
