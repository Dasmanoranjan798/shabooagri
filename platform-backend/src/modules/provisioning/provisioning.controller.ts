import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requirePlatformUser } from "../../shared/utils/requirePlatformUser";
import { prisma } from "../../db/prisma";
import * as provisioningService from "./provisioning.service";

// For a returning, already-provisioned owner (Login page's "Go to my
// dashboard"): re-runs the same idempotent provisioning call, which for
// an existing company just mints a fresh launch token rather than
// creating anything new.
//
// Gated on having an active license — provisionCompanyForUser itself has
// no payment awareness (it just does what it's told), so this is the one
// place that must check before calling it with a user who registered but
// never actually paid.
export async function relaunch(req: Request, res: Response) {
  const user = requirePlatformUser(req);

  const activeLicense = await prisma.license.findFirst({
    where: { platformUserId: user.id, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
  });
  if (!activeLicense) {
    throw new AppError(402, "No active subscription found for this account. Please complete payment first.");
  }

  const result = await provisioningService.provisionCompanyForUser(user.id);
  res.status(200).json(result);
}
