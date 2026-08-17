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
