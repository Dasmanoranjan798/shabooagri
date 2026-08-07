import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as authController from "./auth.controller";

export const authRouter = Router();

// Whether this needs an authenticated caller depends on company state (see
// auth.service.register), so the route can't require or forbid a token
// outright — optionalAuthMiddleware attaches req.user if a valid one is
// present and lets the service layer decide.
authRouter.post("/register", optionalAuthMiddleware, asyncHandler(authController.register));
authRouter.post("/otp/request", asyncHandler(authController.requestOtp));
authRouter.post("/otp/verify", asyncHandler(authController.verifyOtp));
authRouter.post("/login/password", asyncHandler(authController.loginWithPassword));
authRouter.post("/login/pin", asyncHandler(authController.loginWithPin));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));
