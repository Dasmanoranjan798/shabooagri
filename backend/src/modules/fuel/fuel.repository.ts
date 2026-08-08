import { prisma } from "../../db/prisma";

// Only file in this module allowed to import the Prisma client.
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
