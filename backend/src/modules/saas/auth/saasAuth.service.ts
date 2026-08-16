import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../../db/prisma";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/AppError";
import { sendPasswordResetEmail } from "../../../shared/services/mail.service";
import { generateSaasTokens } from "../middleware/saasAuth.middleware";
import { generateUniqueLicenseNumber } from "../utils/licenseNumber.util";
import type {
  SaasChangePasswordInput,
  SaasForgotPasswordInput,
  SaasLoginInput,
  SaasRegisterInput,
  SaasResetPasswordInput,
  SaasVerifyResetTokenInput,
} from "./saasAuth.validation";

const SAAS_PASSWORD_RESET_EXPIRY_MINUTES = 15;

export class SaasAuthService {
  async register(input: SaasRegisterInput) {
    const existing = await prisma.saasUser.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError(409, "A SaaS account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const saasUser = await tx.saasUser.create({
        data: {
          email: input.email.toLowerCase(),
          phone: input.phone,
          passwordHash,
          isEmailVerified: false,
          isPlatformAdmin: false,
        },
      });

      const customerProfile = await tx.saaSCustomerProfile.create({
        data: {
          saasUserId: saasUser.id,
          businessName: input.businessName,
          contactPerson: input.contactPerson,
          phone: input.phone,
          email: input.email.toLowerCase(),
          address: input.address,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          gstin: input.gstin,
          pan: input.pan,
        },
      });

      const licenseNumber = await generateUniqueLicenseNumber();
      const initialLicense = await tx.license.create({
        data: {
          licenseNumber,
          saasUserId: saasUser.id,
          status: "REGISTERED",
        },
      });

      await tx.auditLog.create({
        data: {
          saasUserId: saasUser.id,
          entityType: "SaasUser",
          entityId: saasUser.id,
          action: "SAAS_USER_REGISTERED",
          changes: { email: saasUser.email, businessName: input.businessName },
        },
      });

      return { saasUser, customerProfile, initialLicense };
    });

    const tokens = generateSaasTokens({
      id: result.saasUser.id,
      email: result.saasUser.email,
      isPlatformAdmin: result.saasUser.isPlatformAdmin,
    });

    return {
      tokens,
      user: {
        id: result.saasUser.id,
        email: result.saasUser.email,
        phone: result.saasUser.phone,
        status: result.saasUser.status,
        isPlatformAdmin: result.saasUser.isPlatformAdmin,
      },
      customerProfile: result.customerProfile,
      license: result.initialLicense,
    };
  }

  async login(input: SaasLoginInput) {
    const saasUser = await prisma.saasUser.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { customerProfile: true },
    });

    if (!saasUser) {
      throw new AppError(401, "Invalid email or password");
    }

    if (saasUser.status !== "ACTIVE") {
      throw new AppError(403, "SaaS account is suspended or inactive");
    }

    const isPasswordValid = await bcrypt.compare(input.password, saasUser.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    await prisma.saasUser.update({
      where: { id: saasUser.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateSaasTokens({
      id: saasUser.id,
      email: saasUser.email,
      isPlatformAdmin: saasUser.isPlatformAdmin,
    });

    return {
      tokens,
      user: {
        id: saasUser.id,
        email: saasUser.email,
        phone: saasUser.phone,
        status: saasUser.status,
        isPlatformAdmin: saasUser.isPlatformAdmin,
      },
      customerProfile: saasUser.customerProfile,
    };
  }

  async getMe(saasUserId: string) {
    const saasUser = await prisma.saasUser.findUnique({
      where: { id: saasUserId },
      select: {
        id: true,
        email: true,
        phone: true,
        isEmailVerified: true,
        status: true,
        isPlatformAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        customerProfile: true,
        licenses: true,
      },
    });

    if (!saasUser) {
      throw new AppError(404, "SaaS user not found");
    }

    return saasUser;
  }

  async changePassword(saasUserId: string, input: SaasChangePasswordInput) {
    const saasUser = await prisma.saasUser.findUnique({ where: { id: saasUserId } });

    if (!saasUser) {
      throw new AppError(404, "SaaS user not found");
    }

    const isPasswordValid = await bcrypt.compare(input.currentPassword, saasUser.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

    await prisma.saasUser.update({
      where: { id: saasUserId },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.auditLog.create({
      data: {
        saasUserId: saasUser.id,
        entityType: "SaasUser",
        entityId: saasUser.id,
        action: "SAAS_USER_PASSWORD_CHANGED",
        changes: {},
      },
    });

    return { message: "Password changed successfully." };
  }

  async requestPasswordReset(input: SaasForgotPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const saasUser = await prisma.saasUser.findUnique({ where: { email: normalizedEmail } });

    if (saasUser && saasUser.status === "ACTIVE") {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + SAAS_PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

      await prisma.otpCode.create({
        data: {
          identifier: normalizedEmail,
          codeHash: tokenHash,
          purpose: "SAAS_RESET",
          expiresAt,
        },
      });

      const resetLink = `${env.APP_URL}/saas/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendPasswordResetEmail(normalizedEmail, resetLink);
    }

    // Always return a generic response so this endpoint can't be used to enumerate registered emails.
    return {
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  }

  async verifyPasswordResetToken(input: SaasVerifyResetTokenInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
    const activeOtp = await prisma.otpCode.findFirst({
      where: { identifier: normalizedEmail, purpose: "SAAS_RESET", consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp || activeOtp.codeHash !== tokenHash) {
      throw new AppError(400, "Invalid or expired password reset token");
    }

    return { valid: true };
  }

  async confirmPasswordReset(input: SaasResetPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
    const activeOtp = await prisma.otpCode.findFirst({
      where: { identifier: normalizedEmail, purpose: "SAAS_RESET", consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp || activeOtp.codeHash !== tokenHash) {
      throw new AppError(400, "Invalid or expired password reset token");
    }

    const saasUser = await prisma.saasUser.findUnique({ where: { email: normalizedEmail } });
    if (!saasUser) {
      throw new AppError(400, "Invalid or expired password reset token");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.saasUser.update({
      where: { id: saasUser.id },
      data: { passwordHash: newPasswordHash },
    });
    await prisma.otpCode.update({
      where: { id: activeOtp.id },
      data: { consumedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        saasUserId: saasUser.id,
        entityType: "SaasUser",
        entityId: saasUser.id,
        action: "SAAS_USER_PASSWORD_RESET",
        changes: {},
      },
    });

    return { message: "Your password has been successfully reset." };
  }
}
