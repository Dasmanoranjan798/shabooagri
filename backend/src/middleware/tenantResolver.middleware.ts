import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { isReservedSlug } from "../modules/saas/utils/slug.util";

declare global {
  namespace Express {
    interface Request {
      tenantCompany?: any;
    }
  }
}

export async function tenantResolverMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.headers.host || "";
    const testHeaderSlug = req.headers["x-tenant-slug"] as string | undefined;

    let slug: string | null = null;

    if (testHeaderSlug) {
      slug = testHeaderSlug.toLowerCase().trim();
    } else if (host.includes(".shabooagri.com") || host.includes(".localhost")) {
      const parts = host.split(".");
      if (parts.length >= 3 || (host.includes(".localhost") && parts.length >= 2)) {
        const candidate = parts[0].toLowerCase().trim();
        if (!isReservedSlug(candidate)) {
          slug = candidate;
        }
      }
    }

    if (slug) {
      // Exact slug match only — a fuzzy startsWith/contains fallback here
      // would let a mistyped or partially-matching subdomain resolve to a
      // different tenant's company, leaking that tenant's context into the
      // request. If a slug doesn't match exactly, the tenant doesn't exist.
      const company = await prisma.company.findUnique({
        where: { slug },
        include: { saasLicenses: true },
      });

      if (!company) {
        return res.status(404).json({
          error: "Tenant Not Found",
          message: `Operational software environment for '${slug}' was not found.`,
        });
      }

      if (!company.isActive) {
        return res.status(403).json({
          error: "Tenant Suspended",
          message: "This operational company environment is currently suspended.",
        });
      }

      // Companies provisioned through the SaaS platform carry one or more
      // licenses; a company with no license at all (e.g. an internally
      // managed tenant) is left alone. Where licenses do exist, at least one
      // must still be valid — checked live against expiryDate rather than
      // relying solely on the periodic sweep job to have already flipped
      // its status, so an expired subscription can't ride on a stale status.
      const now = new Date();
      const hasValidLicense = company.saasLicenses.some(
        (license) =>
          (license.status === "LICENSE_ACTIVE" || license.status === "EXPIRING_SOON") &&
          (!license.expiryDate || license.expiryDate > now),
      );
      if (company.saasLicenses.length > 0 && !hasValidLicense) {
        return res.status(402).json({
          error: "License Expired",
          message: "This account's software subscription has expired. Please renew to continue.",
        });
      }

      req.tenantCompany = company;
    }

    next();
  } catch (error) {
    next(error);
  }
}
