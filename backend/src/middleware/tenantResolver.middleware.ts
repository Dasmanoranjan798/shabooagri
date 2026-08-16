import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

declare global {
  namespace Express {
    interface Request {
      tenantCompany?: any;
    }
  }
}

// Slugs that can never be a real tenant subdomain (reserved for infra/hosting).
const RESERVED_SLUGS = new Set(["www", "api", "app", "admin"]);

// Phase 1 is single-tenant (see §2/§9 of the spec): this only does
// best-effort company resolution by subdomain slug, for forward
// multi-tenant compatibility. It never blocks a request on billing/license
// state — that was a Shaboo-side commercial concern that doesn't belong in
// the core operational request path. When no subdomain slug is present,
// req.tenantCompany stays unset and callers (e.g. auth.service) fall back
// to the single-tenant company lookup.
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
        if (!RESERVED_SLUGS.has(candidate)) {
          slug = candidate;
        }
      }
    }

    if (slug) {
      // Exact slug match only — a fuzzy startsWith/contains fallback here
      // would let a mistyped or partially-matching subdomain resolve to a
      // different tenant's company, leaking that tenant's context into the
      // request. If a slug doesn't match exactly, the tenant doesn't exist.
      const company = await prisma.company.findUnique({ where: { slug } });

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
