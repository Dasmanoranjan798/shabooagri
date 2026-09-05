import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as reportsService from "./reports.service";
import type { ReportFilters } from "./reports.service";

function parseFilters(req: Request): ReportFilters {
  const q = req.query;
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
  return {
    from: str(q.from),
    to: str(q.to),
    driverId: str(q.driverId),
    machineId: str(q.machineId),
    customerId: str(q.customerId),
  };
}

export async function driverReport(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await reportsService.getDriverReport(user.companyId, parseFilters(req));
  res.json(result);
}

export async function machineReport(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await reportsService.getMachineReport(user.companyId, parseFilters(req));
  res.json(result);
}

export async function machineMaintenanceReport(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await reportsService.getMachineMaintenanceReport(user.companyId);
  res.json(result);
}
