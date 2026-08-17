import { Router } from "express";
import { optionalPlatformAuthMiddleware } from "../../middleware/auth.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as contactController from "./contact.controller";

export const contactRouter = Router();

// Public — any visitor, logged in or not. Rate-limited (keyed by IP + path
// + submitted email, same pattern as the password-reset limiter) to keep
// the forms from being used as a spam/mail-bombing vector against the
// support mailbox.
const contactRateLimiter = createRateLimiter(15 * 60 * 1000, 10, "Too many submissions. Please try again later.");

contactRouter.use(optionalPlatformAuthMiddleware);

contactRouter.post("/feedback", contactRateLimiter, asyncHandler(contactController.submitFeedback));
contactRouter.post("/support", contactRateLimiter, asyncHandler(contactController.submitSupportRequest));
