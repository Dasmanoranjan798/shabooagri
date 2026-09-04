import type { InviteStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function findAllForCompany(companyId: string) {
  return prisma.staffInvite.findMany({
    where: { companyId },
    include: { role: true, invitedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function findByIdScoped(companyId: string, id: string) {
  return prisma.staffInvite.findFirst({ where: { id, companyId } });
}

export function findPendingByContact(companyId: string, email: string | undefined, phone: string | undefined) {
  return prisma.staffInvite.findMany({
    where: {
      companyId,
      status: "PENDING",
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as Prisma.StaffInviteWhereInput[],
    },
  });
}

export function findByTokenHash(tokenHash: string) {
  return prisma.staffInvite.findFirst({
    where: { tokenHash },
    include: { company: true, role: true, invitedBy: { select: { fullName: true } } },
  });
}

export function create(companyId: string, data: Omit<Prisma.StaffInviteUncheckedCreateInput, "companyId">) {
  return prisma.staffInvite.create({ data: { ...data, companyId } });
}

export function updateStatus(id: string, status: InviteStatus, acceptedAt?: Date) {
  return prisma.staffInvite.update({ where: { id }, data: { status, acceptedAt } });
}

export function findAllUsersForCompany(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobileNumber: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { id: true, name: true, systemKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findUserScoped(companyId: string, id: string) {
  return prisma.user.findFirst({ where: { id, companyId } });
}

export function updateUserStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  return prisma.user.update({ where: { id }, data: { status } });
}
