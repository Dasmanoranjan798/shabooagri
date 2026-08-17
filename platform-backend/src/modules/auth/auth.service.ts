import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PlatformUser } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import * as authRepository from "./auth.repository";
import type { PlatformTokenPayload } from "../../middleware/auth.middleware";
import type { LoginInput, RefreshInput, RegisterInput } from "./auth.validators";

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
