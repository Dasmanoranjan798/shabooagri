import type { OtpPurpose, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

// Only file in the Auth module allowed to import the Prisma client.
// auth.service.ts must go through these functions, never query directly.

// Phase 1 is single-tenant (§2): there is exactly one company row. Once
// Phase 2 adds multi-tenant company management, this is the one place that
// needs to change to real tenant resolution (e.g. by subdomain) — every
// other Auth function already takes a companyId parameter and is unaffected.
export async function findSingleTenantCompany() {
  const pilot = await prisma.company.findFirst({ where: { slug: "pilot" } });
  if (pilot) return pilot;
  return prisma.company.findFirstOrThrow();
}

export function findRoleByKey(companyId: string, systemKey: string) {
  return prisma.role.findFirst({
    where: { companyId, systemKey },
  });
}

export function countUsersInCompany(companyId: string) {
  return prisma.user.count({ where: { companyId } });
}

export function findUserByIdentifier(companyId: string, identifier: string) {
  return prisma.user.findFirst({
    where: {
      companyId,
      // FIX 2: email match is case-insensitive (Prisma uses Postgres ILIKE).
      // Mobile number matching remains exact — numbers are case-agnostic already.
      OR: [{ email: { equals: identifier, mode: "insensitive" } }, { mobileNumber: identifier }],
    },
  });
}

export function findUserByGlobalEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    include: { company: true },
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    // Same depth as updateLastLogin's include below — /auth/me (and
    // anything else routed through this) needs role.rolePermissions
    // populated too, or AppLayout.hasPermission() silently treats every
    // non-owner as having no permissions at all.
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
    // FIX 1: include role relation so the login response user object has the same
    // shape as /auth/me, preventing a TypeError crash in AppLayout.hasPermission().
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
}

export function createOtpCode(data: {
  identifier: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
}) {
  return prisma.otpCode.create({ data });
}

export function findActiveOtp(identifier: string, purpose: OtpPurpose) {
  return prisma.otpCode.findFirst({
    where: { identifier, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export function incrementOtpAttempt(id: string) {
  return prisma.otpCode.update({
    where: { id },
    data: { attemptCount: { increment: 1 } },
  });
}

export function consumeOtp(id: string) {
  return prisma.otpCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}

export function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}) {
  return prisma.refreshToken.create({ data });
}

export function findValidRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export function revokeAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

