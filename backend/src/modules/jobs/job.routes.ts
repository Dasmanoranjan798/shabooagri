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
// Work-session history, assignment-change audit, transportation, and the
// customer-facing work summary — all reads, scoped inside job.service like
// getById (Owner/Manager see all, Driver own jobs, Farmer own booking's job).
jobRouter.get("/:id/work-sessions", asyncHandler(jobController.listWorkSessions));
jobRouter.get("/:id/assignment-changes", asyncHandler(jobController.listAssignmentChanges));
jobRouter.get("/:id/work-summary", asyncHandler(jobController.workSummary));
jobRouter.get("/:id/transport", asyncHandler(jobController.listTransportCharges));

// No POST / — a Job is only ever created internally by booking.service.ts
// the instant a Booking is saved. Every write below is gated by
// job.update_status; job.service.ts additionally enforces that a Driver
// (unlike Owner/Manager) may only act on their own assigned job.
jobRouter.patch("/:id", requirePermission("job.update_status"), asyncHandler(jobController.updateDetails));
jobRouter.post("/:id/start", requirePermission("job.update_status"), asyncHandler(jobController.start));
jobRouter.post("/:id/pause", requirePermission("job.update_status"), asyncHandler(jobController.pause));
jobRouter.post("/:id/resume", requirePermission("job.update_status"), asyncHandler(jobController.resume));
// Stop freezes the clock (WORKING/PAUSED -> STOPPED); Submit is the
// separate, second confirmation that actually completes the job
// (STOPPED -> COMPLETED) and generates its invoice. Kept as two distinct
// routes/permissions-checks (not one "complete" endpoint) to match the
// two separate confirmation dialogs on the Live Job screen.
jobRouter.post("/:id/stop", requirePermission("job.update_status"), asyncHandler(jobController.stop));
jobRouter.post("/:id/submit", requirePermission("job.update_status"), asyncHandler(jobController.submit));
// Owner-only (§ dependency-locked deletion, Rule 2 & 5) — distinct from
// job.update_status, which Driver/Manager also hold for the normal
// start/pause/complete lifecycle. Cancelling is a rarer, corrective
// action gated by dependencyGuard's non-voided-payment check in
// job.service.ts.
jobRouter.post("/:id/cancel", requirePermission("job.cancel"), asyncHandler(jobController.cancel));
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

// Machine/Driver reassignment while PAUSED — gated by the existing
// assignment permissions (Manager/Owner), not job.update_status. The service
// additionally enforces that the job must be PAUSED and requires a reason.
jobRouter.post("/:id/machine", requirePermission("machine.assign"), asyncHandler(jobController.changeMachine));
jobRouter.post("/:id/driver", requirePermission("driver.assign"), asyncHandler(jobController.changeDriver));

// Transportation: an optional structured charge added before final submission.
jobRouter.post("/:id/transport", requirePermission("job.update_status"), asyncHandler(jobController.addTransportCharge));
jobRouter.delete("/:id/transport/:chargeId", requirePermission("job.update_status"), asyncHandler(jobController.deleteTransportCharge));
