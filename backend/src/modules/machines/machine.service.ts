import * as driverService from "../drivers/driver.service";
import * as machineTypeService from "../machine-types/machineType.service";
import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";
import { assertNoBookingReferences } from "../../shared/utils/dependencyGuard";
import * as bookingRepository from "../bookings/booking.repository";
import * as settingsRepo from "../settings/settings.repository";
import * as machineRepository from "./machine.repository";
import * as machineUtilizationService from "./machineUtilization.service";
import type { CreateMachineInput, UpdateMachineInput } from "./machine.validators";

export function list(companyId: string) {
  return machineRepository.findAllForCompany(companyId);
}

// List machines enriched with worked-time + maintenance for the list cards.
// Each machine's numbers come from the single authoritative machine-hour
// calculation (machineUtilization) — no second counter. Per-machine fan-out is
// fine at fleet scale.
export async function listWithUtilization(companyId: string) {
  const machines = await machineRepository.findAllForCompany(companyId);
  return Promise.all(
    machines.map(async (m) => {
      const u = await machineUtilizationService.getMachineMaintenanceStatus(companyId, m.id);
      return {
        ...m,
        totalWorkedHours: u.totalWorked.decimalHours,
        totalWorkedText: u.totalWorked.text,
        maintenanceStatus: u.status,
        maintenanceMessage: u.message,
        maintenanceTrackingEnabled: u.trackingEnabled,
        remainingToServiceText: u.remainingToService.text,
        overdueByText: u.overdueBy.text,
      };
    }),
  );
}

export async function getById(companyId: string, id: string) {
  const machine = await machineRepository.findByIdScopedWithRelations(companyId, id);
  if (!machine) {
    throw new AppError(404, "Machine not found");
  }
  const stats = await machineRepository.getMachineStats(companyId, id);
  return { ...machine, stats };
}

async function assertMachineTypeExists(companyId: string, machineTypeId: string) {
  await machineTypeService.getById(companyId, machineTypeId);
}

async function assertDriverExists(companyId: string, driverId: string) {
  await driverService.getById(companyId, driverId);
}

// Plans are a machine-count ceiling only — Drivers, Managers, and
// Employees are never restricted by plan, on any tier. machineLimit is a
// value cached on the company's own row (set by /internal/update-plan at
// provisioning/upgrade time), never a live lookup against the platform
// backend — this check works identically whether the platform backend is
// up, down, or has never existed for this company (machineLimit is just
// null, meaning unlimited).
async function assertUnderMachineLimit(companyId: string) {
  const company = await settingsRepo.findCompanyById(companyId);
  if (!company || company.machineLimit == null) {
    return;
  }
  const currentCount = await machineRepository.countForCompany(companyId);
  if (currentCount >= company.machineLimit) {
    throw new AppError(
      402,
      "You've reached your plan's machine limit — upgrade to add more.",
      {
        code: "MACHINE_LIMIT_REACHED",
        machineLimit: company.machineLimit,
        upgradeUrl: `${env.PLATFORM_APP_URL}/upgrade?company=${company.slug}`,
      },
    );
  }
}

export async function create(companyId: string, input: CreateMachineInput) {
  await assertUnderMachineLimit(companyId);
  await assertMachineTypeExists(companyId, input.machineTypeId);
  if (input.assignedDriverId) {
    await assertDriverExists(companyId, input.assignedDriverId);
  }
  return machineRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateMachineInput) {
  if (input.machineTypeId) {
    await assertMachineTypeExists(companyId, input.machineTypeId);
  }
  if (input.assignedDriverId) {
    await assertDriverExists(companyId, input.assignedDriverId);
  }
  const updated = await machineRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Machine not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  // Rule 4 (§ dependency-locked deletion) — checked before the delete
  // itself; bookings.machine_id is ON DELETE SET NULL at the DB level, so
  // without this check a delete would silently succeed and null out every
  // referencing booking's machine instead of being blocked.
  const bookingCount = await bookingRepository.countByReference(companyId, { machineId: id });
  assertNoBookingReferences("machine", bookingCount);

  const deleted = await machineRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Machine not found");
  }
}
