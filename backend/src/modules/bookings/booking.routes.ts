import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as bookingController from "./booking.controller";
import { bookingAttachmentUpload } from "./booking.upload";

export const bookingRouter = Router();

bookingRouter.use(authMiddleware);

// No requirePermission gate on the two read routes: unlike the master-data
// modules, Bookings is genuinely visible to all 4 roles, just at different
// scope. booking.service resolves the caller's scope (full company for
// Owner/Manager via operations.view, own-assigned-jobs for Driver, own
// booking history for Farmer) rather than a route-level permission check.
bookingRouter.get("/", asyncHandler(bookingController.list));
bookingRouter.get("/:id", asyncHandler(bookingController.getById));
bookingRouter.get("/:id/attachments", asyncHandler(bookingController.listAttachments));

bookingRouter.post("/", requirePermission("booking.create"), asyncHandler(bookingController.create));
bookingRouter.patch("/:id", requirePermission("booking.edit"), asyncHandler(bookingController.updateDetails));
bookingRouter.patch("/:id/status", requirePermission("booking.edit"), asyncHandler(bookingController.updateStatus));
bookingRouter.patch(
  "/:id/machine",
  requirePermission("machine.assign"),
  asyncHandler(bookingController.assignMachine),
);
bookingRouter.patch("/:id/driver", requirePermission("driver.assign"), asyncHandler(bookingController.assignDriver));
bookingRouter.delete("/:id", requirePermission("booking.delete"), asyncHandler(bookingController.remove));

bookingRouter.post(
  "/:id/attachments",
  requirePermission("booking.edit"),
  bookingAttachmentUpload.single("file"),
  asyncHandler(bookingController.addAttachment),
);
