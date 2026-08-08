// Every master-data module (Villages, Machine Types, Machines, Employees,
// Drivers, Customers, ...) needs the exact same tenant-scoping shape: "does
// this row exist AND belong to this company" before an update/delete is
// allowed to touch it. Phase 1 has one company, so this can't be caught by
// an accidental cross-company data leak today — but writing it once, here,
// means every module already behaves correctly once Phase 2 adds more
// companies, instead of five copies of the same check silently drifting.
//
// `data: any` is intentional: this helper only needs findFirst/update/delete
// to exist with a `{ where }` / `{ where, data }` shape, which every Prisma
// model delegate satisfies — the caller's repository still gets full
// Prisma type-safety on how it invokes create()/findMany() etc. directly.
interface ScopableDelegate<T> {
  findFirst(args: { where: Record<string, unknown> }): Promise<T | null>;
  update(args: { where: Record<string, unknown>; data: unknown }): Promise<T>;
  delete(args: { where: Record<string, unknown> }): Promise<T>;
}

export function createScopedRepository<T>(delegate: ScopableDelegate<T>) {
  return {
    findByIdScoped(companyId: string, id: string): Promise<T | null> {
      return delegate.findFirst({ where: { id, companyId } });
    },

    async updateScoped(companyId: string, id: string, data: unknown): Promise<T | null> {
      const existing = await delegate.findFirst({ where: { id, companyId } });
      if (!existing) return null;
      return delegate.update({ where: { id }, data });
    },

    async deleteScoped(companyId: string, id: string): Promise<T | null> {
      const existing = await delegate.findFirst({ where: { id, companyId } });
      if (!existing) return null;
      return delegate.delete({ where: { id } });
    },
  };
}
