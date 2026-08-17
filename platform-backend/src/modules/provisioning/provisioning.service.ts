import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import { prisma } from "../../db/prisma";

// This is the ONLY connection point between the platform backend and the
// operational backend — a single outbound HTTP call, made once per user
// (on successful payment), authenticated with a shared key that exists
// for no other purpose. It never runs on any operational request path;
// the operational backend has no idea this service exists until it's
// called. If the platform backend is down, broken, or misconfigured,
// nothing here can affect an existing operational company at all.
interface InternalProvisionResponse {
  company: { id: string; slug: string; name: string };
  ownerUser: { id: string; fullName: string; email: string };
  // Short-lived, single-use — never a real access/refresh token pair. See
  // the operational backend's auth.service.issueLaunchToken/exchangeLaunchToken.
  launchToken: string;
  softwareUrl: string;
  alreadyProvisioned: boolean;
}

export interface ProvisionResult extends InternalProvisionResponse {
  // softwareUrl + the launch token as a query param — the one thing the
  // browser needs to actually land in the new company's dashboard.
  redirectUrl: string;
}

export async function provisionCompanyForUser(
  platformUserId: string,
  plan: { planKey: string; machineLimit: number },
): Promise<ProvisionResult> {
  const user = await prisma.platformUser.findUnique({ where: { id: platformUserId } });
  if (!user) {
    throw new AppError(404, "Platform user not found");
  }

  const res = await fetch(`${env.OPERATIONAL_API_URL}/internal/provision-company`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({
      platformUserId: user.id,
      businessName: user.businessName,
      contactPerson: user.contactPerson,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      gstin: user.gstin,
      pan: user.pan,
      planKey: plan.planKey,
      machineLimit: plan.machineLimit,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string };
    throw new AppError(502, `Company provisioning failed: ${body.error || res.statusText}`);
  }

  const result = (await res.json()) as InternalProvisionResponse;

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { companySlug: result.company.slug },
  });

  return {
    ...result,
    redirectUrl: `${result.softwareUrl}/sso?token=${encodeURIComponent(result.launchToken)}`,
  };
}

interface InternalUpdatePlanResponse {
  company: { id: string; slug: string; name: string; planKey: string | null; machineLimit: number | null };
  launchToken: string | null;
  softwareUrl: string;
}

// Upgrade path for an already-provisioned company: updates only the
// operational Company's cached plan/limit fields via /internal/update-plan
// — never touches roles/users, and never re-runs provisioning.
export async function updatePlanForUser(
  platformUserId: string,
  plan: { planKey: string; machineLimit: number },
): Promise<InternalUpdatePlanResponse & { redirectUrl: string | null }> {
  const user = await prisma.platformUser.findUnique({ where: { id: platformUserId } });
  if (!user || !user.companySlug) {
    throw new AppError(404, "No company has been provisioned for this account yet");
  }

  const res = await fetch(`${env.OPERATIONAL_API_URL}/internal/update-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({ platformUserId: user.id, planKey: plan.planKey, machineLimit: plan.machineLimit }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string };
    throw new AppError(502, `Plan update failed: ${body.error || res.statusText}`);
  }

  const result = (await res.json()) as InternalUpdatePlanResponse;
  return {
    ...result,
    redirectUrl: result.launchToken
      ? `${result.softwareUrl}/sso?token=${encodeURIComponent(result.launchToken)}`
      : null,
  };
}
