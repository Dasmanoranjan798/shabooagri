import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { generateSlugCandidate, isReservedSlug } from "../utils/slug.util";

export class SaasProvisioningService {
  async provisionTenantForSaasUser(saasUserId: string) {
    const saasUser = await prisma.saasUser.findUnique({
      where: { id: saasUserId },
      include: { customerProfile: true, licenses: true },
    });

    if (!saasUser) {
      throw new AppError(404, "SaaS User not found for provisioning");
    }

    const activeLicense = saasUser.licenses.find((l) => l.status === "LICENSE_ACTIVE");
    if (!activeLicense) {
      throw new AppError(
        402,
        "No active paid license found for this account. Complete payment to activate your software access.",
      );
    }

    // If company is already bound to license, reuse existing company
    if (activeLicense && activeLicense.companyId) {
      const existingCompany = await prisma.company.findUnique({
        where: { id: activeLicense.companyId },
        include: { users: { include: { role: true } } },
      });
      if (existingCompany) {
        const ownerUser = existingCompany.users.find((u) => u.role.systemKey === "owner") || existingCompany.users[0];
        return {
          company: existingCompany,
          ownerUser,
          tenantSlug: existingCompany.slug,
          softwareUrl: `https://${existingCompany.slug}.shabooagri.com`,
          alreadyProvisioned: true,
        };
      }
    }

    const profile = saasUser.customerProfile;
    const businessName = profile?.businessName || "Agri Machinery Business";
    const contactPerson = profile?.contactPerson || "Business Owner";
    const phone = profile?.phone || saasUser.phone || "9876543210";

    // Generate unique, non-reserved tenant slug
    let baseSlug = generateSlugCandidate(businessName);
    if (isReservedSlug(baseSlug)) {
      baseSlug = `${baseSlug}agri`;
    }

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await prisma.company.findUnique({ where: { slug: finalSlug } });
      if (!existingSlug) break;
      finalSlug = `${baseSlug}${counter}`;
      counter++;
    }

    // Provision Company & OWNER User in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: businessName,
          slug: finalSlug,
          phone,
          email: saasUser.email,
          address: profile?.address,
          city: profile?.city,
          state: profile?.state,
          pincode: profile?.pincode,
          gstin: profile?.gstin,
          pan: profile?.pan,
          isGstRegistered: !!profile?.gstin,
          currency: "INR",
          invoicePrefix: "INV",
        },
      });

      // Seed system roles (owner, manager, driver, farmer) for company
      const allPermissions = await tx.permission.findMany();
      const permMap = new Map(allPermissions.map((p) => [p.key, p.id]));

      const roleDefs = [
        { systemKey: "owner", name: "Owner", perms: Array.from(permMap.keys()) },
        {
          systemKey: "manager",
          name: "Manager",
          perms: [
            "dashboard.view",
            "booking.create",
            "booking.edit",
            "machine.assign",
            "driver.assign",
            "job.update_status",
            "payment.receive",
            "report.generate",
            "user.manage",
            "village.manage",
            "machine_type.manage",
            "machine.manage",
            "employee.manage",
            "driver.manage",
            "customer.manage",
            "expense.manage",
            "operations.view",
          ],
        },
        { systemKey: "driver", name: "Driver", perms: ["job.update_status"] },
        { systemKey: "farmer", name: "Farmer", perms: [] },
      ];

      let ownerRole = null;
      for (const rDef of roleDefs) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            systemKey: rDef.systemKey,
            name: rDef.name,
            isSystemRole: true,
          },
        });

        if (rDef.systemKey === "owner") {
          ownerRole = role;
        }

        // Attach permissions
        for (const pKey of rDef.perms) {
          const pId = permMap.get(pKey);
          if (pId) {
            await tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: pId,
              },
            });
          }
        }
      }

      if (!ownerRole) {
        throw new AppError(500, "Failed to seed owner role for provisioned company");
      }

      // Create operational OWNER User
      const ownerUser = await tx.user.create({
        data: {
          companyId: company.id,
          roleId: ownerRole.id,
          fullName: contactPerson,
          email: saasUser.email,
          mobileNumber: phone,
          status: "ACTIVE",
        },
      });

      // Bind active license to company if license exists
      if (activeLicense) {
        await tx.license.update({
          where: { id: activeLicense.id },
          data: {
            companyId: company.id,
            status: "LICENSE_ACTIVE",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          saasUserId,
          companyId: company.id,
          entityType: "Company",
          entityId: company.id,
          action: "TENANT_PROVISIONED",
          changes: { slug: finalSlug, businessName, ownerEmail: saasUser.email },
        },
      });

      return { company, ownerUser, tenantSlug: finalSlug };
    });

    return {
      company: result.company,
      ownerUser: result.ownerUser,
      tenantSlug: result.tenantSlug,
      softwareUrl: `https://${result.tenantSlug}.shabooagri.com`,
      alreadyProvisioned: false,
    };
  }
}
