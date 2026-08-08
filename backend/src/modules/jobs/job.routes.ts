import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as jobController from "./job.controller";
import { jobPhotoUpload } from "./job.upload";

export const jobRouter = Router();

jobRouter.use(authMiddleware);

// No requirePermission on reads, same reasoning as Bookings: job.service
// resolves the caller's own scope (full company for Owner/Manager, own
// assigned jobs for Driver, own booking's job for Farmer) rather than a
// route-level permission check.
jobRouter.get("/", asyncHandler(jobController.list));
jobRouter.get("/:id", asyncHandler(jobController.getById));
jobRouter.get("/:id/fuel-entries", asyncHandler(jobController.listFuelEntries));
jobRouter.get("/:id/photos", asyncHandler(jobController.listPhotos));

// No POST / — a Job is only ever created internally by booking.service.ts
// when a Booking moves to ON_THE_WAY. Every write below is gated by
// job.update_status; job.service.ts additionally enforces that a Driver
// (unlike Owner/Manager) may only act on their own assigned job.
jobRouter.patch("/:id", requirePermission("job.update_status"), asyncHandler(jobController.updateDetails));
jobRouter.post("/:id/start", requirePermission("job.update_status"), asyncHandler(jobController.start));
jobRouter.post("/:id/pause", requirePermission("job.update_status"), asyncHandler(jobController.pause));
jobRouter.post("/:id/resume", requirePermission("job.update_status"), asyncHandler(jobController.resume));
jobRouter.post("/:id/complete", requirePermission("job.update_status"), asyncHandler(jobController.complete));
jobRouter.post(
  "/:id/fuel-entries",
  requirePermission("job.update_status"),
  asyncHandler(jobController.addFuelEntry),
);
jobRouter.post(
  "/:id/photos",
  requirePermission("job.update_status"),
  jobPhotoUpload.single("file"),
  asyncHandler(jobController.addPhoto),
);
jobRouter.post("/manual", requirePermission("booking.create"), asyncHandler(jobController.createManualJob));
