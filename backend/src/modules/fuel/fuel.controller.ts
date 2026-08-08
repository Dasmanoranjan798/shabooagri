import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as fuelService from "./fuel.service";

// Company-wide fuel entry listing. A single driver can only see entries for
// their own jobs via the Jobs surface; this endpoint is operations.view-gated
// so only Owner/Manager reach it (see fuel.routes.ts).
export async function listFuelEntries(req: Request, res: Response) {
  const user = requireUser(req);
  const machineId = typeof req.query.machineId === "string" ? req.query.machineId : undefined;
  const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
  const fromDate = typeof req.query.from === "string" ? req.query.from : undefined;
  const toDate = typeof req.query.to === "string" ? req.query.to : undefined;
  const entries = await fuelService.listAll(user.companyId, { machineId, jobId, fromDate, toDate });
  res.json(entries);
}
