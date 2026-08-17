import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requirePlatformUser } from "../../shared/utils/requirePlatformUser";
import { prisma } from "../../db/prisma";
import * as plansRepository from "../plans/plans.repository";
import * as provisioningService from "./provisioning.service";

// For a returning, already-provisioned owner (Login page's "Go to my
// dashboard"): re-runs the same idempotent provisioning call, which for
// an existing company just mints a fresh launch token rather than
// creating anything new — the plan/machineLimit passed through here are
// validated but ignored on that path (see internal.service.provisionCompany's
// "existing company" branch), so it's safe even if they're slightly stale.
//
// Gated on having an active license — provisionCompanyForUser itself has
// no payment awareness (it just does what it's told), so this is the one
// place that must check before calling it with a user who registered but
// never actually paid.
export async function relaunch(req: Request, res: Response) {
  const user = requirePlatformUser(req);

  const activeLicense = await prisma.license.findFirst({
    where: { platformUserId: user.id, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!activeLicense) {
    throw new AppError(402, "No active subscription found for this account. Please complete payment first.");
  }

  const plan = await plansRepository.findPlanByKey(activeLicense.planKey);
  const result = await provisioningService.provisionCompanyForUser(user.id, {
    planKey: activeLicense.planKey,
    machineLimit: plan?.machineLimit ?? 0,
  });
  res.status(200).json(result);
}

// For the Upgrade page: what plan is this account currently on, if any.
// Read-only, no side effects.
export async function status(req: Request, res: Response) {
  const user = requirePlatformUser(req);

  const activeLicense = await prisma.license.findFirst({
    where: { platformUserId: user.id, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    orderBy: { createdAt: "desc" },
  });

  const platformUser = await prisma.platformUser.findUnique({ where: { id: user.id } });

  res.status(200).json({
    companySlug: platformUser?.companySlug ?? null,
    currentPlanKey: activeLicense?.planKey ?? null,
  });
}
