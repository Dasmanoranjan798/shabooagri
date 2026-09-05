import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as driverController from "./driver.controller";

export const driverRouter = Router();

driverRouter.use(authMiddleware);

driverRouter.get("/", requirePermission("operations.view"), asyncHandler(driverController.list));
driverRouter.get("/:id", requirePermission("operations.view"), asyncHandler(driverController.getById));
// No requirePermission gate: a Driver may view their own compensation
// summary. driver.service resolves the caller's scope (any driver for
// Owner/Manager via operations.view, only their own record for a Driver)
// rather than a route-level permission check — same pattern as Bookings.
driverRouter.get("/:id/compensation", asyncHandler(driverController.getCompensationSummary));

// Driver Payment Out. Reads are scope-checked in the service (a Driver sees
// only their own earnings/payments — self-service), so no route-level
// permission gate on the GETs. Writes are gated: recording a payment needs
// driver_payment.pay (Owner/Manager); cancelling needs driver_payment.cancel
// (Owner only), mirroring the customer Payment In cancel rule.
driverRouter.get("/:id/earnings", asyncHandler(driverController.getEarnings));
driverRouter.get("/:id/payments", asyncHandler(driverController.listPayments));
driverRouter.post(
  "/:id/payments",
  requirePermission("driver_payment.pay"),
  asyncHandler(driverController.recordPayment),
);
driverRouter.post(
  "/:id/payments/:paymentId/cancel",
  requirePermission("driver_payment.cancel"),
  asyncHandler(driverController.cancelPayment),
);

driverRouter.post("/", requirePermission("driver.manage"), asyncHandler(driverController.create));
driverRouter.patch("/:id", requirePermission("driver.manage"), asyncHandler(driverController.update));
// Owner-only (§ dependency-locked deletion, Rule 4 & 5) — distinct from
// driver.manage, which a Manager holds for create/edit/mark-unavailable.
driverRouter.delete("/:id", requirePermission("driver.delete"), asyncHandler(driverController.remove));
