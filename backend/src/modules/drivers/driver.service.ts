import * as employeeService from "../employees/employee.service";
import * as driverCompensationService from "./driverCompensation.service";
import * as driverPaymentRepository from "./driverPayment.repository";
import { AppError } from "../../shared/errors/AppError";
import { assertNoBookingReferences } from "../../shared/utils/dependencyGuard";
import * as bookingRepository from "../bookings/booking.repository";
import * as driverRepository from "./driver.repository";
import { resolveCallerScope } from "../../shared/access/callerScope";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { CreateDriverInput, UpdateDriverInput } from "./driver.validators";

export function list(companyId: string) {
  return driverRepository.findAllForCompany(companyId);
}

// List drivers enriched with worked-time + payable for the list cards. Each
// driver's numbers come from the SAME authoritative services the detail screen
// uses (driverCompensation for earned/worked, driverPayment sum for paid) — no
// second calculation. Per-driver fan-out is fine at fleet scale.
export async function listWithEarnings(companyId: string) {
  const drivers = await driverRepository.findAllForCompany(companyId);
  return Promise.all(
    drivers.map(async (d) => {
      const [comp, paid] = await Promise.all([
        driverCompensationService.getDriverCompensationSummary(companyId, d.id),
        driverPaymentRepository.sumNonCancelledForDriver(companyId, d.id),
      ]);
      const earned = Math.round(comp.calculatedEarnings * 100) / 100;
      const totalPaid = Math.round(paid * 100) / 100;
      const remainingPayable = Math.round((earned - totalPaid) * 100) / 100;
      return {
        ...d,
        totalWorkedHours: comp.totalWorkedHours,
        totalWorkedMinutes: comp.totalWorkedMinutes,
        workedText: `${Math.floor(Math.round(comp.totalWorkedMinutes) / 60)} h ${Math.round(comp.totalWorkedMinutes) % 60} min`,
        totalCompletedJobs: comp.totalCompletedJobs,
        totalEarned: earned,
        totalPaid,
        remainingPayable,
        paymentStatus: totalPaid <= 0.005 ? "UNPAID" : totalPaid >= earned - 0.005 && earned > 0 ? "PAID" : "PARTIALLY_PAID",
      };
    }),
  );
}

export async function getById(companyId: string, id: string) {
  const driver = await driverRepository.findByIdScopedWithRelations(companyId, id);
  if (!driver) {
    throw new AppError(404, "Driver not found");
  }
  return driver;
}

// Not-found is expected (most employees aren't drivers) — used for identity
// resolution (Bookings scoping a Driver user to their own assigned jobs),
// not validation, so this returns null instead of throwing.
export function getByEmployeeId(companyId: string, employeeId: string) {
  return driverRepository.findByEmployeeIdScoped(companyId, employeeId);
}

// Cross-module read via the Employees module's own service — a Driver
// profile only ever extends an existing Employee record, it never creates
// or duplicates one.
async function assertEmployeeExists(companyId: string, employeeId: string) {
  await employeeService.getById(companyId, employeeId);
}

export async function create(companyId: string, input: CreateDriverInput) {
  await assertEmployeeExists(companyId, input.employeeId);
  return driverRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateDriverInput) {
  if (input.employeeId) {
    await assertEmployeeExists(companyId, input.employeeId);
  }
  const updated = await driverRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Driver not found");
  }
  return updated;
}

export async function remove(companyId: string, id: string) {
  // Rule 4 (§ dependency-locked deletion) — bookings.driver_id is
  // ON DELETE SET NULL at the DB level, so without this check a delete
  // would silently succeed and null out every referencing booking's
  // driver instead of being blocked.
  const bookingCount = await bookingRepository.countByReference(companyId, { driverId: id });
  assertNoBookingReferences("driver", bookingCount);

  const deleted = await driverRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Driver not found");
  }
}

export async function getCompensationSummary(companyId: string, id: string, user: AuthenticatedUser) {
  const scope = await resolveCallerScope(companyId, user);
  const isVisible = scope.kind === "company" || (scope.kind === "driver" && scope.driverId === id);
  if (!isVisible) {
    // 404, not 403 — a Driver should not learn that another driver's
    // compensation record exists at all.
    throw new AppError(404, "Driver not found");
  }
  return driverCompensationService.getDriverCompensationSummary(companyId, id);
}
