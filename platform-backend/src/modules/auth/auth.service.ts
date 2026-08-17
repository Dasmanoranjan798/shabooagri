import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PlatformUser } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import * as authRepository from "./auth.repository";
import { sendPasswordResetEmail } from "../../shared/services/mail.service";
import type { PlatformTokenPayload } from "../../middleware/auth.middleware";
import type {
  ChangePasswordInput,
  ConfirmPasswordResetInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  RequestPasswordResetInput,
  VerifyPasswordResetTokenInput,
} from "./auth.validators";

const BCRYPT_ROUNDS = 10;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration format: ${duration}`);
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return new Date(base.getTime() + value * unitMs);
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: PlatformUser) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

async function issueTokenPair(user: PlatformUser): Promise<TokenPair> {
  const accessPayload: PlatformTokenPayload = { sub: user.id, email: user.email, type: "platform_access" };
  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshPayload: PlatformTokenPayload = { sub: user.id, email: user.email, type: "platform_refresh" };
  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  await authRepository.createRefreshToken({
    platformUserId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN),
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await authRepository.findByEmail(input.email);
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const user = await authRepository.createUser({
    email: input.email.toLowerCase(),
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    businessName: input.businessName,
    contactPerson: input.contactPerson,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    gstin: input.gstin,
    pan: input.pan,
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await authRepository.findByEmail(input.email);
  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new AppError(401, "Invalid credentials");
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function refreshTokens(input: RefreshInput) {
  let payload: PlatformTokenPayload;
  try {
    payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET) as PlatformTokenPayload;
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }
  if (payload.type !== "platform_refresh") {
    throw new AppError(401, "Invalid token type");
  }

  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await authRepository.findValidRefreshTokenByHash(tokenHash);
  if (!stored) {
    throw new AppError(401, "Refresh token has been revoked or expired");
  }

  const user = await authRepository.findById(payload.sub);
  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  await authRepository.revokeRefreshToken(stored.id);
  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function getProfile(userId: string) {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return toPublicUser(user);
}

const PASSWORD_RESET_EXPIRY_MINUTES = 15;

// Forgot-password flow for a locked-out platform account. Always returns
// the same generic message regardless of whether the email exists, to
// avoid account enumeration.
export async function requestPasswordReset(input: RequestPasswordResetInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await authRepository.findByEmail(normalizedEmail);

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = addDuration(new Date(), `${PASSWORD_RESET_EXPIRY_MINUTES}m`);

    await authRepository.createPasswordResetToken({ email: normalizedEmail, tokenHash, expiresAt });

    const resetLink = `${env.PLATFORM_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendPasswordResetEmail(normalizedEmail, resetLink);
  }

  return { message: "If an account with that email exists, a password reset link has been sent." };
}

export async function verifyPasswordResetToken(input: VerifyPasswordResetTokenInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const activeToken = await authRepository.findActivePasswordResetToken(normalizedEmail);

  if (!activeToken || activeToken.tokenHash !== tokenHash) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  return { valid: true };
}

export async function confirmPasswordReset(input: ConfirmPasswordResetInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const activeToken = await authRepository.findActivePasswordResetToken(normalizedEmail);

  if (!activeToken || activeToken.tokenHash !== tokenHash) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  const user = await authRepository.findByEmail(normalizedEmail);
  if (!user) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await authRepository.updatePassword(user.id, newPasswordHash);
  await authRepository.consumePasswordResetToken(activeToken.id);
  await authRepository.revokeAllRefreshTokensForUser(user.id);

  return { message: "Password has been successfully reset. You may now log in with your new password." };
}

// Self-service change, for a user who is already logged in — distinct from
// the request/confirm email-token flow above.
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError(401, "Current password is incorrect");
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await authRepository.updatePassword(userId, newPasswordHash);

  // Force re-login on other devices/sessions; the caller's own current
  // access token stays valid until it naturally expires.
  await authRepository.revokeAllRefreshTokensForUser(userId);

  return { message: "Password changed successfully." };
}
