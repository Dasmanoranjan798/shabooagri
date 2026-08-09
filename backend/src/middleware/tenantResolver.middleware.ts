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
      let company = await prisma.company.findUnique({
        where: { slug },
        include: { saasLicenses: true },
      });

      // Resilient fallback for common typo variations (e.g. 'greenfild' or 'greenfield' -> 'greenfields')
      if (!company && (slug === "greenfild" || slug === "greenfield")) {
        company = await prisma.company.findFirst({
          where: {
            OR: [
              { slug: "greenfields" },
              { slug: "greenfieldscustomhiring" },
            ],
          },
          include: { saasLicenses: true },
        });
      }

      // Secondary fallback: prefix or name match
      if (!company) {
        company = await prisma.company.findFirst({
          where: {
            OR: [
              { slug: { startsWith: slug } },
              { name: { contains: slug, mode: "insensitive" } },
            ],
          },
          include: { saasLicenses: true },
        });
      }

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

      req.tenantCompany = company;
    }

    next();
  } catch (error) {
    next(error);
  }
}
