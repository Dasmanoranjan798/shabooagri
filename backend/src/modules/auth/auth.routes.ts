import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as authController from "./auth.controller";
import * as staffInviteController from "../team/staffInvite.controller";

export const authRouter = Router();

const resetRateLimiter = createRateLimiter(15 * 60 * 1000, 5);

// Brute-force / abuse protection for the unauthenticated auth surface (P1-4).
// Windows are 15 min, bucketed per (IP, endpoint, identifier) — see
// rateLimit.middleware. Limits are generous enough for real typos/retries but
// far below what a credential- or OTP-guessing run needs:
//  - login (password & PIN): a 4-6 digit PIN is the weakest secret here, so
//    login attempts are capped tightly. 10/15min per account per IP makes
//    exhausting even a 4-digit PIN (10k combos) infeasible in practice, while
//    leaving ample room for a user mistyping their password/PIN a few times.
//  - OTP request: each one can send a real SMS/email, so this is the tightest
//    (5/15min) to stop OTP flooding and cost/abuse.
//  - OTP verify: caps code-guessing per identifier on top of the existing
//    per-code attempt ceiling (OTP_MAX_ATTEMPTS) in auth.service.
const loginRateLimiter = createRateLimiter(15 * 60 * 1000, 10, "Too many login attempts. Please wait a few minutes and try again.");
const otpRequestRateLimiter = createRateLimiter(15 * 60 * 1000, 5, "Too many OTP requests. Please wait a few minutes before requesting another code.");
const otpVerifyRateLimiter = createRateLimiter(15 * 60 * 1000, 10, "Too many OTP attempts. Please wait a few minutes and try again.");

// Whether this needs an authenticated caller depends on company state (see
// auth.service.register), so the route can't require or forbid a token
// outright — optionalAuthMiddleware attaches req.user if a valid one is
// present and lets the service layer decide.
authRouter.post("/register", optionalAuthMiddleware, asyncHandler(authController.register));
authRouter.post("/otp/request", otpRequestRateLimiter, asyncHandler(authController.requestOtp));
authRouter.post("/otp/verify", otpVerifyRateLimiter, asyncHandler(authController.verifyOtp));
authRouter.post("/login/password", loginRateLimiter, asyncHandler(authController.loginWithPassword));
authRouter.post("/login/pin", loginRateLimiter, asyncHandler(authController.loginWithPin));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/sso-exchange", asyncHandler(authController.ssoExchange));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

// Password reset routes
authRouter.post("/password-reset/request", resetRateLimiter, asyncHandler(authController.requestPasswordReset));
authRouter.post("/password-reset/verify-token", asyncHandler(authController.verifyPasswordResetToken));
authRouter.post("/password-reset/confirm", asyncHandler(authController.confirmPasswordReset));

authRouter.post("/change-password", authMiddleware, asyncHandler(authController.changePassword));

// Create/reset the caller's own PIN. Authenticated (a live session, or an OTP
// login moments earlier in the Create-PIN/Forgot-PIN flow). Rate-limited on
// top of the auth requirement to cap abuse of repeated PIN writes.
authRouter.post("/set-pin", authMiddleware, resetRateLimiter, asyncHandler(authController.setPin));

// Staff invite acceptance routes (public — invitee has no account yet)
authRouter.post("/invite/verify-token", asyncHandler(staffInviteController.verifyToken));
authRouter.post("/invite/accept", resetRateLimiter, asyncHandler(staffInviteController.accept));

