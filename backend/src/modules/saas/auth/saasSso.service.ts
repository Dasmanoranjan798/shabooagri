import crypto from "crypto";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { issueSsoTokenPair } from "../../auth/auth.service";
import { SaasProvisioningService } from "../provisioning/saasProvisioning.service";

const provisioningService = new SaasProvisioningService();

export class SaasSsoService {
  async createSsoLaunchToken(saasUserId: string) {
    const saasUser = await prisma.saasUser.findUnique({
      where: { id: saasUserId },
      include: {
        customerProfile: true,
        licenses: { include: { company: { include: { users: { include: { role: true } } } } } },
      },
    });

    if (!saasUser) {
      throw new AppError(404, "SaaS user not found");
    }

    let company: any = saasUser.licenses.find((l) => l.company)?.company || null;
    let ownerUser: any = company?.users?.find((u: any) => u.role?.systemKey === "owner") || null;

    // If tenant is not yet provisioned, provision it now
    if (!company || !ownerUser) {
      const provisionRes = await provisioningService.provisionTenantForSaasUser(saasUserId);
      company = provisionRes.company;
      ownerUser = provisionRes.ownerUser;
    }

    if (!company || !ownerUser) {
      throw new AppError(400, "Operational software tenant is not provisioned for this account");
    }

    // Generate single-use, 5-minute SSO token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.ssoToken.create({
      data: {
        tokenHash,
        saasUserId,
        companyId: company.id,
        userId: ownerUser.id,
        expiresAt,
      },
    });

    const tenantSlug = company.slug;
    const softwareUrl = `https://${tenantSlug}.shabooagri.com?ssoToken=${rawToken}`;

    return {
      ssoToken: rawToken,
      tenantSlug,
      softwareUrl,
      companyName: company.name,
    };
  }

  async exchangeSsoToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== "string") {
      throw new AppError(400, "Invalid SSO launch token");
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const result = await prisma.$transaction(async (tx) => {
      const ssoRecord = await tx.ssoToken.findUnique({
        where: { tokenHash },
        include: {
          company: true,
          user: { include: { role: true } },
          saasUser: true,
        },
      });

      if (!ssoRecord) {
        throw new AppError(401, "Invalid or expired SSO token");
      }

      if (ssoRecord.usedAt) {
        throw new AppError(401, "SSO token has already been used");
      }

      if (new Date() > ssoRecord.expiresAt) {
        throw new AppError(401, "SSO token has expired");
      }

      // Mark single-use token as used
      await tx.ssoToken.update({
        where: { id: ssoRecord.id },
        data: { usedAt: new Date() },
      });

      if (!ssoRecord.company.isActive) {
        throw new AppError(403, "Target operational company account is suspended");
      }

      if (ssoRecord.user.status !== "ACTIVE") {
        throw new AppError(403, "Operational user account is inactive");
      }

      // Update last login timestamp for operational user
      await tx.user.update({
        where: { id: ssoRecord.user.id },
        data: { lastLoginAt: new Date() },
      });

      return ssoRecord;
    });

    // Generate operational tokens for the target company & user
    const tokens = await issueSsoTokenPair(result.user);

    return {
      tokens,
      user: {
        id: result.user.id,
        companyId: result.company.id,
        fullName: result.user.fullName,
        email: result.user.email,
        mobileNumber: result.user.mobileNumber,
        role: result.user.role.systemKey || result.user.role.name,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
      },
    };
  }
}
