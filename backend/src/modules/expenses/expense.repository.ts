import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.expense);

const includeRelations = {
  category: true,
  machine: true,
  incurredByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.ExpenseInclude;

export function findAllCategories(companyId: string) {
  return prisma.expenseCategory.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export function findCategoryByIdScoped(companyId: string, id: string) {
  return prisma.expenseCategory.findFirst({
    where: { id, companyId },
  });
}

export function createCategory(companyId: string, name: string) {
  return prisma.expenseCategory.create({
    data: { companyId, name },
  });
}

export function findAllForCompany(companyId: string, filter: { categoryId?: string; machineId?: string } = {}) {
  return prisma.expense.findMany({
    where: { companyId, ...filter },
    include: includeRelations,
    orderBy: { expenseDate: "desc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.expense.findFirst({
    where: { id, companyId },
    include: includeRelations,
  });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function create(
  companyId: string,
  incurredBy: string,
  data: Omit<Prisma.ExpenseUncheckedCreateInput, "companyId" | "incurredBy">,
) {
  return prisma.expense.create({
    data: { ...data, companyId, incurredBy },
    include: includeRelations,
  });
}

export function updateScoped(companyId: string, id: string, data: Prisma.ExpenseUncheckedUpdateInput) {
  return scoped.updateScoped(companyId, id, data);
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
