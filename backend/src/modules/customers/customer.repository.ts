import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.customer);

// Address (incl. village/locality) lives on the Customer row itself now — the
// old Village relation was removed — so plain scalar reads carry everything.
export function findAllForCompany(companyId: string) {
  return prisma.customer.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.customer.findFirst({ where: { id, companyId } });
}

// Distinct, non-empty village/locality names for this company — powers the
// village filter/reporting pickers that used to read the Village master.
export async function distinctVillages(companyId: string) {
  const rows = await prisma.customer.findMany({
    where: { companyId, village: { not: null } },
    distinct: ["village"],
    select: { village: true },
    orderBy: { village: "asc" },
  });
  return rows.map((r) => r.village!).filter((v) => v.trim().length > 0);
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByUserIdScoped(companyId: string, userId: string) {
  return prisma.customer.findFirst({ where: { companyId, userId } });
}

export function findByPhoneScoped(companyId: string, phone: string) {
  return prisma.customer.findFirst({ where: { companyId, phone } });
}

export function findByNameAndVillageScoped(companyId: string, name: string, village: string | null | undefined) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      // Same locality (case-insensitive) — or both blank — plus same name.
      village: village && village.trim() ? { equals: village.trim(), mode: "insensitive" } : null,
      name: { equals: name, mode: "insensitive" },
    },
  });
}

export function create(companyId: string, data: Omit<Prisma.CustomerUncheckedCreateInput, "companyId">) {
  return prisma.customer.create({ data: { ...data, companyId } });
}

export function updateScoped(companyId: string, id: string, data: Prisma.CustomerUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
