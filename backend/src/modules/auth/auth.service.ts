import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import * as authRepository from "./auth.repository";
import * as rbacService from "../rbac/rbac.service";
import { sendOtpEmail, sendPasswordResetEmail } from "../../shared/services/mail.service";
import type { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from "./auth.types";
import type {
  ChangePasswordInput,
  ConfirmPasswordResetInput,
  LogoutInput,
  OtpRequestInput,
  OtpVerifyInput,
  PasswordLoginInput,
  PinLoginInput,
  RefreshInput,
  RegisterInput,
  RequestPasswordResetInput,
  VerifyPasswordResetTokenInput,
} from "./auth.validators";

const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// jsonwebtoken accepts "15m" / "30d" style strings for signing but we also
// need the equivalent Date to store alongside the refresh token row, so it
// can be checked/expired without re-parsing the JWT. Only s/m/h/d are used
// anywhere in this app's config, so that's all this supports.
function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration format: ${duration}`);
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return new Date(base.getTime() + value * unitMs);
}

function hashRefreshToken(token: string): string {
  // Deterministic (unlike bcrypt) on purpose: the DB needs to look a
  // presented refresh token up by its hash. Safe without a per-token salt
  // because the input is a high-entropy signed JWT, not a low-entropy
  // secret like a password — there is nothing for a rainbow table to target.
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, pinHash: _pinHash, ...publicUser } = user;
  return publicUser;
}

async function issueTokenPair(user: User): Promise<TokenPair> {
  const accessPayload: AccessTokenPayload = {
    sub: user.id,
    companyId: user.companyId,
    roleId: user.roleId,
    type: "access",
  };
  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshPayload: RefreshTokenPayload = {
    sub: user.id,
    companyId: user.companyId,
    type: "refresh",
  };
  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN),
  });

  return { accessToken, refreshToken };
}

export async function issueSsoTokenPair(user: User): Promise<TokenPair> {
  return issueTokenPair(user);
}

// §6: Owner creates Manager/Driver/Customer accounts. Phase 1 has no
// Employees/Customers admin UI yet to do that through, so this endpoint is
// the only way to create a user — which makes its own gate the only thing
// standing between "single-tenant SaaS" and "anyone can mint themselves an
// Owner account." Two rules, enforced in order:
//   1. Zero users in the company yet → anonymous registration is allowed,
//      and the new user is forced to Owner regardless of requested role —
//      nobody exists yet who could have authorized anything else.
//   2. At least one user already exists → the caller must be authenticated
//      and hold the 'user.manage' permission, checked through rbac.service
//      (seeded onto Owner and Manager — see prisma/seed.ts) so this and
//      requirePermission() share one source of truth instead of each
//      module hardcoding its own role-name comparison.
const REGISTER_USER_PERMISSION = "user.manage";

export async function register(input: RegisterInput, requestingUser?: AuthenticatedUser) {
  const company = await authRepository.findSingleTenantCompany();
  const existingUserCount = await authRepository.countUsersInCompany(company.id);

  let roleKey: string = input.roleKey;

  if (existingUserCount === 0) {
    roleKey = "owner";
  } else {
    if (!requestingUser) {
      throw new AppError(401, "Authentication required to register additional users");
    }
    const allowed = await rbacService.userHasPermission(requestingUser.roleId, REGISTER_USER_PERMISSION);
    if (!allowed) {
      throw new AppError(403, `Missing required permission: ${REGISTER_USER_PERMISSION}`);
    }
  }

  const role = await authRepository.findRoleByKey(company.id, roleKey);
  if (!role) {
    throw new AppError(400, `Unknown role: ${roleKey}`);
  }

  if (input.email || input.mobileNumber) {
    const existing = await authRepository.findUserByIdentifier(company.id, input.email ?? input.mobileNumber!);
    if (existing) {
      throw new AppError(409, "A user with this email or mobile number already exists");
    }
  }

  const user = await authRepository.createUser({
    company: { connect: { id: company.id } },
    role: { connect: { id: role.id } },
    fullName: input.fullName,
    email: input.email,
    mobileNumber: input.mobileNumber,
    passwordHash: input.password ? await bcrypt.hash(input.password, BCRYPT_ROUNDS) : undefined,
    pinHash: input.pin ? await bcrypt.hash(input.pin, BCRYPT_ROUNDS) : undefined,
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function requestOtp(input: OtpRequestInput) {
  const company = await authRepository.findSingleTenantCompany();
  const user = await authRepository.findUserByIdentifier(company.id, input.identifier);
  if (!user) {
    throw new AppError(404, "No account found for this identifier");
  }

  const code = generateOtpCode();
  await authRepository.createOtpCode({
    identifier: input.identifier,
    codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
    purpose: "LOGIN",
    expiresAt: addDuration(new Date(), `${OTP_EXPIRY_MINUTES}m`),
  });

  if (input.identifier.includes("@")) {
    await sendOtpEmail(input.identifier, code);
  }

  console.log(`[dev-only] OTP for ${input.identifier}: ${code}`);
  return {
    message: "OTP sent",
    devOtp: env.NODE_ENV !== "production" ? code : undefined,
  };
}

export async function verifyOtpAndLogin(input: OtpVerifyInput) {
  const otp = await authRepository.findActiveOtp(input.identifier, "LOGIN");
  if (!otp) {
    throw new AppError(400, "No active OTP for this identifier — request a new one");
  }
  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw new AppError(429, "Too many incorrect attempts — request a new OTP");
  }

  const matches = await bcrypt.compare(input.code, otp.codeHash);
  if (!matches) {
    await authRepository.incrementOtpAttempt(otp.id);
    throw new AppError(401, "Incorrect OTP code");
  }
  await authRepository.consumeOtp(otp.id);

  const company = await authRepository.findSingleTenantCompany();
  const user = await authRepository.findUserByIdentifier(company.id, input.identifier);
  if (!user) {
    throw new AppError(404, "No account found for this identifier");
  }

  const updatedUser = await authRepository.updateLastLogin(user.id);
  const tokens = await issueTokenPair(updatedUser);
  return { user: toPublicUser(updatedUser), ...tokens };
}

export async function loginWithPassword(input: PasswordLoginInput) {
  const company = await authRepository.findSingleTenantCompany();
  const user = await authRepository.findUserByIdentifier(company.id, input.identifier);
  if (!user?.passwordHash) {
    throw new AppError(401, "Invalid credentials");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new AppError(401, "Invalid credentials");
  }

  const updatedUser = await authRepository.updateLastLogin(user.id);
  const tokens = await issueTokenPair(updatedUser);
  return { user: toPublicUser(updatedUser), ...tokens };
}

export async function loginWithPin(input: PinLoginInput) {
  const company = await authRepository.findSingleTenantCompany();
  const user = await authRepository.findUserByIdentifier(company.id, input.identifier);
  if (!user?.pinHash) {
    throw new AppError(401, "Invalid credentials");
  }

  const matches = await bcrypt.compare(input.pin, user.pinHash);
  if (!matches) {
    throw new AppError(401, "Invalid credentials");
  }

  const updatedUser = await authRepository.updateLastLogin(user.id);
  const tokens = await issueTokenPair(updatedUser);
  return { user: toPublicUser(updatedUser), ...tokens };
}

export async function refreshTokens(input: RefreshInput) {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }
  if (payload.type !== "refresh") {
    throw new AppError(401, "Invalid token type");
  }

  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await authRepository.findValidRefreshTokenByHash(tokenHash);
  if (!stored) {
    throw new AppError(401, "Refresh token has been revoked or expired");
  }

  const user = await authRepository.findUserById(payload.sub);
  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  // Rotation: the presented refresh token is single-use. Revoking it here
  // means a leaked-but-already-used token cannot be replayed.
  await authRepository.revokeRefreshToken(stored.id);
  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(input: LogoutInput) {
  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await authRepository.findValidRefreshTokenByHash(tokenHash);
  if (stored) {
    await authRepository.revokeRefreshToken(stored.id);
  }
  return { message: "Logged out" };
}

export async function getProfile(userId: string) {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return toPublicUser(user);
}

// For other modules (Employees, Customers) that let a business record
// optionally link to an existing login account (e.g. granting a driver or
// farmer portal access). Scoped by company, unlike getProfile above, since
// this is used to validate a caller-supplied userId rather than "give me
// my own profile."
export async function getUserForCompany(companyId: string, userId: string) {
  const user = await authRepository.findUserById(userId);
  if (!user || user.companyId !== companyId) {
    throw new AppError(404, "User not found");
  }
  return toPublicUser(user);
}

const PASSWORD_RESET_EXPIRY_MINUTES = 15;

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  tenantCompany?: any,
  requestHost?: string
) {
  const company = tenantCompany || (await authRepository.findSingleTenantCompany());
  const normalizedEmail = input.email.trim().toLowerCase();
  
  let user: any = await authRepository.findUserByIdentifier(company.id, normalizedEmail);
  let targetCompany = company;

  if (!user) {
    const globalUser = await authRepository.findUserByGlobalEmail(normalizedEmail);
    if (globalUser) {
      user = globalUser;
      if (globalUser.company) {
        targetCompany = globalUser.company;
      }
    }
  }

  if (user && user.status === "ACTIVE") {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = addDuration(new Date(), `${PASSWORD_RESET_EXPIRY_MINUTES}m`);

    await authRepository.createOtpCode({
      identifier: normalizedEmail,
      codeHash: tokenHash,
      purpose: "RESET",
      expiresAt,
    });

    let baseUrl = env.APP_URL;
    const tenantSlug = targetCompany.slug || "";

    if (requestHost && (requestHost.includes(".shabooagri.com") || requestHost.includes(".localhost"))) {
      const protocol = requestHost.includes("localhost") ? "http" : "https";
      baseUrl = `${protocol}://${requestHost}`;
    } else if (tenantSlug && tenantSlug !== "pilot" && env.APP_URL.includes("shabooagri.com")) {
      baseUrl = `https://${tenantSlug}.shabooagri.com`;
    }

    const resetLink = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}${tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ""}`;
    await sendPasswordResetEmail(normalizedEmail, resetLink);
  }

  // Always return generic response to prevent account enumeration
  return {
    message: "If an account with that email exists, a password reset link has been sent.",
  };
}

export async function verifyPasswordResetToken(input: VerifyPasswordResetTokenInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const activeOtp = await authRepository.findActiveOtp(normalizedEmail, "RESET");

  if (!activeOtp || activeOtp.codeHash !== tokenHash) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  return { valid: true };
}

export async function confirmPasswordReset(input: ConfirmPasswordResetInput, tenantCompany?: any) {
  const company = tenantCompany || (await authRepository.findSingleTenantCompany());
  const normalizedEmail = input.email.trim().toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const activeOtp = await authRepository.findActiveOtp(normalizedEmail, "RESET");

  if (!activeOtp || activeOtp.codeHash !== tokenHash) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  let user: any = await authRepository.findUserByIdentifier(company.id, normalizedEmail);
  let targetCompany = company;

  if (!user) {
    const globalUser = await authRepository.findUserByGlobalEmail(normalizedEmail);
    if (globalUser) {
      user = globalUser;
      if (globalUser.company) {
        targetCompany = globalUser.company;
      }
    }
  }

  if (!user) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await authRepository.updateUserPassword(user.id, newPasswordHash);
  await authRepository.consumeOtp(activeOtp.id);
  await authRepository.revokeAllUserRefreshTokens(user.id);

  return {
    message: "Password has been successfully reset. You may now log in with your new password.",
    tenantSlug: targetCompany.slug || null,
  };
}

// Self-service change, for a user who is already logged in — distinct from
// the request/verify/confirm email-token flow above, and doesn't depend on
// SMTP being configured at all.
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.passwordHash) {
    if (!input.currentPassword) {
      throw new AppError(400, "Current password is required");
    }
    const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError(401, "Current password is incorrect");
    }
  }
  // else: user has never set a password (PIN/OTP-only login) — this call is
  // setting one for the first time, nothing to verify against.

  const newPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await authRepository.updateUserPassword(userId, newPasswordHash);

  // Force re-login on other devices/sessions; the caller's own current
  // access token stays valid until it naturally expires.
  await authRepository.revokeAllUserRefreshTokens(userId);

  return { message: "Password changed successfully." };
}

