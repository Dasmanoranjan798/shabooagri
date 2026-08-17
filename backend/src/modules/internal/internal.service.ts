import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { issueSsoTokenPair } from "../auth/auth.service";
import { PRICING_METHOD_DEFAULTS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../../shared/seedData";
import { isReservedSlug, slugify } from "../../shared/utils/slug";
import type { ProvisionCompanyInput } from "./internal.validators";

// Called exactly once per platform customer, from the platform backend's
// payment-verification flow — never from a browser, never on any
// operational request path. Mirrors prisma/seed.ts's bootstrap shape
// (same shared role/permission/pricing-method data) but for a brand-new
// company instead of the pilot one.
export async function provisionCompany(input: ProvisionCompanyInput) {
  // Idempotent: a retried call (e.g. the platform backend's HTTP request
  // timed out but actually succeeded server-side) must not create a second
  // company for the same platform user.
  const existing = await prisma.company.findUnique({
    where: { platformUserId: input.platformUserId },
    include: { users: { include: { role: true } } },
  });
  if (existing) {
    const ownerUser = existing.users.find((u) => u.role.systemKey === "owner") ?? existing.users[0];
    if (!ownerUser) {
      throw new AppError(500, "Previously provisioned company has no owner user");
    }
    const tokens = await issueSsoTokenPair(ownerUser);
    return {
      company: { id: existing.id, slug: existing.slug, name: existing.name },
      ownerUser: { id: ownerUser.id, fullName: ownerUser.fullName, email: ownerUser.email },
      tokens,
      softwareUrl: `https://${existing.slug}.shabooagri.com`,
      alreadyProvisioned: true,
    };
  }

  let baseSlug = slugify(input.businessName);
  if (isReservedSlug(baseSlug)) {
    baseSlug = `${baseSlug}-agri`;
  }
  let finalSlug = baseSlug;
  let counter = 1;
  while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.businessName,
        slug: finalSlug,
        platformUserId: input.platformUserId,
        phone: input.phone,
        email: input.email,
        address: input.address ?? undefined,
        city: input.city ?? undefined,
        state: input.state ?? undefined,
        pincode: input.pincode ?? undefined,
        gstin: input.gstin ?? undefined,
        pan: input.pan ?? undefined,
        isGstRegistered: !!input.gstin,
      },
    });

    const allPermissions = await tx.permission.findMany();
    const permissionIdByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

    let ownerRoleId: string | null = null;
    for (const roleDef of SYSTEM_ROLES) {
      const role = await tx.role.create({
        data: { companyId: company.id, systemKey: roleDef.systemKey, name: roleDef.name, isSystemRole: true },
      });
      if (roleDef.systemKey === "owner") ownerRoleId = role.id;

      for (const permissionKey of ROLE_PERMISSIONS[roleDef.systemKey]) {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (!permissionId) continue;
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId } });
      }
    }
    if (!ownerRoleId) {
      throw new AppError(500, "Failed to seed owner role for provisioned company");
    }

    for (const method of PRICING_METHOD_DEFAULTS) {
      await tx.pricingMethod.create({
        data: { companyId: company.id, key: method.key, label: method.label, unit: method.unit },
      });
    }

    // No password set here — this owner's first access is via the SSO
    // token pair returned below. They can set a direct-login password
    // later through the existing forgot-password flow (looks up by email,
    // unaffected by this endpoint).
    const ownerUser = await tx.user.create({
      data: {
        companyId: company.id,
        roleId: ownerRoleId,
        fullName: input.contactPerson,
        email: input.email,
        mobileNumber: input.phone,
        status: "ACTIVE",
      },
    });

    return { company, ownerUser };
  });

  const tokens = await issueSsoTokenPair(result.ownerUser);

  return {
    company: { id: result.company.id, slug: result.company.slug, name: result.company.name },
    ownerUser: { id: result.ownerUser.id, fullName: result.ownerUser.fullName, email: result.ownerUser.email },
    tokens,
    softwareUrl: `https://${result.company.slug}.shabooagri.com`,
    alreadyProvisioned: false,
  };
}
