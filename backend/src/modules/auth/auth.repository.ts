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
      OR: [{ email: identifier }, { mobileNumber: identifier }],
    },
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
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
