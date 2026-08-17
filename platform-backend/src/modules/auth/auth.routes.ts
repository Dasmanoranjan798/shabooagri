import { Router } from "express";
import { platformAuthMiddleware } from "../../middleware/auth.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as authController from "./auth.controller";

export const authRouter = Router();

const resetRateLimiter = createRateLimiter(15 * 60 * 1000, 5);

authRouter.post("/register", asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.get("/me", platformAuthMiddleware, asyncHandler(authController.me));

authRouter.post("/password-reset/request", resetRateLimiter, asyncHandler(authController.requestPasswordReset));
authRouter.post("/password-reset/verify-token", asyncHandler(authController.verifyPasswordResetToken));
authRouter.post("/password-reset/confirm", asyncHandler(authController.confirmPasswordReset));
authRouter.post("/change-password", platformAuthMiddleware, asyncHandler(authController.changePassword));
