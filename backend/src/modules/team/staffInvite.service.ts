import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import { sendStaffInviteEmail } from "../../shared/services/mail.service";
import { issueSsoTokenPair } from "../auth/auth.service";
import * as authRepository from "../auth/auth.repository";
import * as staffInviteRepository from "./staffInvite.repository";
import type { AcceptInviteInput, CreateInviteInput, SetUserStatusInput } from "./staffInvite.validators";

const BCRYPT_ROUNDS = 10;
const INVITE_EXPIRY_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Same tenant-subdomain resolution auth.service.requestPasswordReset already
// uses, so invite links land on the same host password-reset links do.
function resolveBaseUrl(companySlug: string, requestHost?: string): string {
  if (requestHost && (requestHost.includes(".shabooagri.com") || requestHost.includes(".localhost"))) {
    const protocol = requestHost.includes("localhost") ? "http" : "https";
    return `${protocol}://${requestHost}`;
  }
  if (companySlug && companySlug !== "pilot" && env.APP_URL.includes("shabooagri.com")) {
    return `https://${companySlug}.shabooagri.com`;
  }
  return env.APP_URL;
}

export async function createInvite(
  companyId: string,
  invitedByUserId: string,
  input: CreateInviteInput,
  requestHost?: string,
) {
  const role = await prisma.role.findFirst({ where: { id: input.roleId, companyId } });
  if (!role) {
    throw new AppError(400, "Unknown role");
  }

  if (role.systemKey === "farmer" && !input.villageId && !input.customerId) {
    throw new AppError(400, "Village is required when inviting a farmer");
  }
  if (input.villageId) {
    const village = await prisma.village.findFirst({ where: { id: input.villageId, companyId } });
    if (!village) {
      throw new AppError(400, "Unknown village");
    }
  }

  if (input.employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, companyId } });
    if (!employee) {
      throw new AppError(400, "Unknown employee");
    }
    if (employee.userId) {
      throw new AppError(409, "This employee already has a login account");
    }
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, companyId } });
    if (!customer) {
      throw new AppError(400, "Unknown customer");
    }
    if (customer.userId) {
      throw new AppError(409, "This customer already has a portal account");
    }
  }

  const contact = input.email?.trim().toLowerCase() || input.phone?.trim();
  const existingUser = contact ? await authRepository.findUserByIdentifier(companyId, contact) : null;
  if (existingUser) {
    throw new AppError(409, "A user with this email or phone already exists in your company");
  }

  // Re-inviting the same contact supersedes any prior pending invite —
  // this is how "resend" works, no separate resend endpoint needed.
  const pending = await staffInviteRepository.findPendingByContact(
    companyId,
    input.email?.trim().toLowerCase(),
    input.phone?.trim(),
  );
  await Promise.all(pending.map((p) => staffInviteRepository.updateStatus(p.id, "REVOKED")));

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await staffInviteRepository.create(companyId, {
    roleId: input.roleId,
    fullName: input.fullName.trim(),
    email: input.email?.trim().toLowerCase(),
    phone: input.phone?.trim(),
    villageId: input.villageId,
    employeeId: input.employeeId,
    customerId: input.customerId,
    tokenHash,
    invitedByUserId,
    expiresAt,
  });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const inviter = await prisma.user.findUnique({ where: { id: invitedByUserId } });
  const baseUrl = resolveBaseUrl(company!.slug, requestHost);
  const inviteLink = `${baseUrl}/accept-invite?token=${rawToken}`;

  let emailSent = false;
  if (input.email) {
    emailSent = await sendStaffInviteEmail(input.email, inviteLink, company!.name, role.name, inviter!.fullName);
  }

  return {
    invite,
    inviteLink,
    // Phone-only invites have no SMS gateway yet — the caller shows this
    // link directly so the owner can share it manually (WhatsApp, SMS, etc.)
    // until a gateway key is configured.
    deliveryMethod: input.email ? (emailSent ? "email" : "email_failed") : "manual_link",
  };
}

export async function listInvites(companyId: string) {
  return staffInviteRepository.findAllForCompany(companyId);
}

export async function revokeInvite(companyId: string, id: string) {
  const invite = await staffInviteRepository.findByIdScoped(companyId, id);
  if (!invite) {
    throw new AppError(404, "Invite not found");
  }
  if (invite.status !== "PENDING") {
    throw new AppError(400, `Cannot revoke an invite that is already ${invite.status}`);
  }
  return staffInviteRepository.updateStatus(id, "REVOKED");
}

type InviteWithRelations = Prisma.StaffInviteGetPayload<{
  include: { company: true; role: true; invitedBy: { select: { fullName: true } }; village: true };
}>;

async function loadValidInvite(token: string): Promise<InviteWithRelations> {
  const tokenHash = hashToken(token);
  const invite = await staffInviteRepository.findByTokenHash(tokenHash);
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired invite link");
  }
  return invite;
}

export async function verifyInviteToken(token: string) {
  const invite = await loadValidInvite(token);
  return {
    companyName: invite.company.name,
    roleName: invite.role.name,
    inviterName: invite.invitedBy.fullName,
    fullName: invite.fullName,
    email: invite.email,
    phone: invite.phone,
  };
}

export async function acceptInvite(input: AcceptInviteInput) {
  const invite = await loadValidInvite(input.token);
  const role = invite.role;
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        companyId: invite.companyId,
        roleId: invite.roleId,
        fullName: invite.fullName,
        email: invite.email,
        mobileNumber: invite.phone,
        passwordHash,
        status: "ACTIVE",
      },
    });

    if (invite.employeeId) {
      // Grants login access to an Employee record that already exists
      // (invited from the Employees page) instead of creating a new one.
      await tx.employee.update({ where: { id: invite.employeeId }, data: { userId: newUser.id } });
      if (role.systemKey === "driver") {
        const existingDriver = await tx.driver.findUnique({ where: { employeeId: invite.employeeId } });
        if (!existingDriver) {
          await tx.driver.create({
            data: {
              companyId: invite.companyId,
              employeeId: invite.employeeId,
              availabilityStatus: "AVAILABLE",
            },
          });
        }
      }
    } else if (role.systemKey === "driver") {
      const employee = await tx.employee.create({
        data: {
          companyId: invite.companyId,
          userId: newUser.id,
          name: invite.fullName,
          phone: invite.phone,
          roleTitle: "Driver",
          employmentStatus: "ACTIVE",
        },
      });
      await tx.driver.create({
        data: {
          companyId: invite.companyId,
          employeeId: employee.id,
          availabilityStatus: "AVAILABLE",
        },
      });
    } else if (invite.customerId) {
      // Grants portal access to a Customer record that already exists
      // (invited from the Customers page) instead of creating a new one.
      await tx.customer.update({ where: { id: invite.customerId }, data: { userId: newUser.id } });
    } else if (role.systemKey === "farmer") {
      await tx.customer.create({
        data: {
          companyId: invite.companyId,
          userId: newUser.id,
          name: invite.fullName,
          villageId: invite.villageId!,
          phone: invite.phone,
        },
      });
    }

    await tx.staffInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });

    return newUser;
  });

  const tokens = await issueSsoTokenPair(user);
  // Re-fetch with role.rolePermissions populated — same shape login/`/auth/me`
  // return, so the new account's very first render has working permissions.
  const fullUser = await authRepository.findUserById(user.id);
  const { passwordHash: _ph, pinHash: _pinh, ...publicUser } = fullUser!;
  return { user: publicUser, ...tokens };
}

export async function listUsers(companyId: string) {
  return staffInviteRepository.findAllUsersForCompany(companyId);
}

export async function setUserStatus(companyId: string, id: string, input: SetUserStatusInput) {
  const user = await staffInviteRepository.findUserScoped(companyId, id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return staffInviteRepository.updateUserStatus(id, input.status);
}
