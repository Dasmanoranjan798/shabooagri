export const RESERVED_TENANT_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "portal",
  "auth",
  "mail",
  "static",
  "assets",
  "shaboo",
  "support",
  "billing",
  "login",
  "register",
  "dashboard",
  "system",
  "root",
  "public",
  "help",
]);

export function generateSlugCandidate(name: string): string {
  if (!name || typeof name !== "string") return "company";

  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces & hyphens
    .replace(/[\s_]+/g, "")       // Collapse spaces/underscores
    .replace(/^-+|-+$/g, "");     // Remove leading/trailing hyphens

  if (!slug || slug.length < 2) {
    slug = "company";
  }

  return slug;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_TENANT_SLUGS.has(slug.toLowerCase().trim());
}
