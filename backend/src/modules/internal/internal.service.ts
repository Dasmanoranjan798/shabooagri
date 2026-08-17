import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { issueLaunchToken } from "../auth/auth.service";
import { PRICING_METHOD_DEFAULTS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../../shared/seedData";
import { isReservedSlug, slugify } from "../../shared/utils/slug";
import type { ProvisionCompanyInput, UpdatePlanInput } from "./internal.validators";

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
    const launchToken = await issueLaunchToken(ownerUser.id);
    return {
      company: { id: existing.id, slug: existing.slug, name: existing.name },
      ownerUser: { id: ownerUser.id, fullName: ownerUser.fullName, email: ownerUser.email },
      launchToken,
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
        planKey: input.planKey,
        machineLimit: input.machineLimit,
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

    // No password set here — this owner's first access is via the launch
    // token returned below (exchanged for real tokens by the browser at
    // /auth/sso-exchange). They can set a direct-login password later
    // through the existing forgot-password flow (looks up by email,
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

  const launchToken = await issueLaunchToken(result.ownerUser.id);

  return {
    company: { id: result.company.id, slug: result.company.slug, name: result.company.name },
    ownerUser: { id: result.ownerUser.id, fullName: result.ownerUser.fullName, email: result.ownerUser.email },
    launchToken,
    softwareUrl: `https://${result.company.slug}.shabooagri.com`,
    alreadyProvisioned: false,
  };
}

// Called from the platform backend's upgrade-payment flow, for a company
// that already exists — updates only the cached plan/limit fields
// machine.service checks. Never touches roles, users, or anything else
// about the company; a plan upgrade is a machine-count ceiling change,
// nothing more (§ "Drivers/Managers/Employees remain unlimited on every
// plan, always").
export async function updatePlan(input: UpdatePlanInput) {
  const company = await prisma.company.findUnique({
    where: { platformUserId: input.platformUserId },
    include: { users: { include: { role: true } } },
  });
  if (!company) {
    throw new AppError(404, "No company has been provisioned for this account yet");
  }

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { planKey: input.planKey, machineLimit: input.machineLimit },
  });

  // Issue a launch token too, same as provisioning, so the upgrade
  // payment flow can redirect the browser straight back into the
  // dashboard afterward instead of leaving them on the platform site.
  const ownerUser = company.users.find((u) => u.role.systemKey === "owner") ?? company.users[0];
  const launchToken = ownerUser ? await issueLaunchToken(ownerUser.id) : null;

  return {
    company: { id: updated.id, slug: updated.slug, name: updated.name, planKey: updated.planKey, machineLimit: updated.machineLimit },
    launchToken,
    softwareUrl: `https://${updated.slug}.shabooagri.com`,
  };
}
