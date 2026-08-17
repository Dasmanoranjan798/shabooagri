import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function findByEmail(email: string) {
  return prisma.platformUser.findUnique({ where: { email: email.toLowerCase() } });
}

export function findById(id: string) {
  return prisma.platformUser.findUnique({ where: { id } });
}

export function createUser(data: Prisma.PlatformUserCreateInput) {
  return prisma.platformUser.create({ data });
}

export function createRefreshToken(data: { platformUserId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.refreshToken.create({ data });
}

export function findValidRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
}

export function revokeAllRefreshTokensForUser(platformUserId: string) {
  return prisma.refreshToken.updateMany({
    where: { platformUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function updatePassword(id: string, passwordHash: string) {
  return prisma.platformUser.update({ where: { id }, data: { passwordHash } });
}

export function createPasswordResetToken(data: { email: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data });
}

export function findActivePasswordResetToken(email: string) {
  return prisma.passwordResetToken.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export function consumePasswordResetToken(id: string) {
  return prisma.passwordResetToken.update({ where: { id }, data: { consumedAt: new Date() } });
}
