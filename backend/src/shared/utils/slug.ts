// Subdomain slugs are infra-facing identifiers, not just cosmetic —
// tenantResolverMiddleware resolves a company purely by exact slug match
// against the Host header, so this must always produce a DNS-safe,
// lowercase, hyphenated candidate.
const RESERVED_SLUGS = new Set(["www", "api", "app", "admin", "pilot", "mail", "ftp"]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}
