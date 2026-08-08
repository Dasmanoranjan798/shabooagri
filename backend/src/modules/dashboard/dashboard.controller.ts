import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requireUser } from "../../shared/utils/requireUser";
import * as dashboardService from "./dashboard.service";
import type { TimeRange } from "./dashboard.service";

// Validated set of accepted range values. Any other value is a 400 error.
const VALID_RANGES: readonly TimeRange[] = ["7d", "30d", "90d", "12m"];

function parseRange(raw: unknown): TimeRange {
  if (typeof raw === "string" && VALID_RANGES.includes(raw as TimeRange)) {
    return raw as TimeRange;
  }
  throw new AppError(400, `Invalid range. Accepted values: ${VALID_RANGES.join(", ")}`);
}

// GET /dashboard/summary
// Returns KPIs, machine status, today's jobs, and pending payments.
// Company-scoped (Owner/Manager); Driver gets limited view; Farmer is gated
// out in the service layer.
export async function getSummary(req: Request, res: Response) {
  const user = requireUser(req);
  const data = await dashboardService.getSummary(user.companyId, user);
  res.json(data);
}

// GET /dashboard/income?range=7d|30d|90d|12m
// Returns payment time-series for the Income Overview chart.
export async function getIncomeSeries(req: Request, res: Response) {
  const user = requireUser(req);
  const range = parseRange(req.query.range ?? "30d");
  const data = await dashboardService.getIncomeSeries(user.companyId, user, range);
  res.json(data);
}

// GET /dashboard/fuel?range=7d|30d|90d|12m
// Returns fuel consumption time-series for the Fuel Consumption bar chart.
export async function getFuelSeries(req: Request, res: Response) {
  const user = requireUser(req);
  const range = parseRange(req.query.range ?? "30d");
  const data = await dashboardService.getFuelSeries(user.companyId, user, range);
  res.json(data);
}
