import { prisma } from "../../db/prisma";

// Only file in this module allowed to import the Prisma client.

// Company-wide listing — used by GET /fuel/entries. Supports optional
// filters so the UI can drill into a specific machine or date window.
export function findAllForCompany(
  companyId: string,
  filter: { machineId?: string; jobId?: string; fromDate?: string; toDate?: string } = {},
) {
  const where: Record<string, unknown> = { companyId };
  if (filter.machineId) where.machineId = filter.machineId;
  if (filter.jobId) where.jobId = filter.jobId;
  if (filter.fromDate || filter.toDate) {
    where.recordedAt = {};
    if (filter.fromDate) (where.recordedAt as Record<string, Date>).gte = new Date(filter.fromDate);
    if (filter.toDate) {
      const to = new Date(filter.toDate);
      to.setDate(to.getDate() + 1); // inclusive end date: shift to next day midnight
      (where.recordedAt as Record<string, Date>).lt = to;
    }
  }
  return prisma.jobFuelEntry.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    include: {
      machine: { select: { id: true, registrationNumber: true, brand: true, model: true } },
      job: { select: { id: true } },
      recorder: { select: { id: true, fullName: true } },
    },
  });
}

export function findAllForJob(companyId: string, jobId: string) {
  return prisma.jobFuelEntry.findMany({ where: { companyId, jobId }, orderBy: { recordedAt: "desc" } });
}

export function create(
  companyId: string,
  jobId: string,
  machineId: string,
  litres: number,
  cost: number | undefined,
  recordedBy: string,
) {
  return prisma.jobFuelEntry.create({ data: { companyId, jobId, machineId, litres, cost, recordedBy } });
}

export async function sumLitresForJob(companyId: string, jobId: string): Promise<number> {
  const result = await prisma.jobFuelEntry.aggregate({
    where: { companyId, jobId },
    _sum: { litres: true },
  });
  return result._sum.litres != null ? Number(result._sum.litres) : 0;
}

// Aggregates total litres recorded in a date window, grouped by calendar day.
// Used by Dashboard fuel-consumption chart. Scoped to company. Computes
// aggregation in PostgreSQL (no in-Node table scan). recordedAt is UTC —
// callers are responsible for passing UTC boundaries that correspond to the
// desired company-timezone days (see dashboard.service.ts buildDateSeries).
export async function getLitresByDay(
  companyId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<Array<{ date: string; litres: number }>> {
  // Prisma groupBy on a DateTime field groups by the full timestamp, not just
  // the date, so we use a raw query to cast to ::date in PostgreSQL. This is
  // the only raw query in the codebase; documented here so a future developer
  // can see why it was necessary.
  const rows = await prisma.$queryRaw<Array<{ day: Date; total_litres: string }>>`
    SELECT
      date_trunc('day', recorded_at)::date AS day,
      SUM(litres)::text                    AS total_litres
    FROM job_fuel_entries
    WHERE company_id = ${companyId}::uuid
      AND recorded_at >= ${fromUtc}
      AND recorded_at <  ${toUtc}
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10), // YYYY-MM-DD (UTC date of the bucket)
    litres: Number(r.total_litres),
  }));
}
