import bcrypt from "bcryptjs";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { generateSaasTokens } from "../middleware/saasAuth.middleware";
import { generateUniqueLicenseNumber } from "../utils/licenseNumber.util";
import type { SaasLoginInput, SaasRegisterInput } from "./saasAuth.validation";

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
}
