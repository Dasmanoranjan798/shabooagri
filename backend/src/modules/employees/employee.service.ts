import * as authService from "../auth/auth.service";
import { AppError } from "../../shared/errors/AppError";
import { assertNoBookingReferences } from "../../shared/utils/dependencyGuard";
import * as bookingRepository from "../bookings/booking.repository";
import * as driverRepository from "../drivers/driver.repository";
import * as employeeRepository from "./employee.repository";
import { writeAudit } from "../../shared/audit/audit.service";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./employee.validators";

export function list(companyId: string) {
  return employeeRepository.findAllForCompany(companyId);
}

export async function getById(companyId: string, id: string) {
  const employee = await employeeRepository.findByIdScoped(companyId, id);
  if (!employee) {
    throw new AppError(404, "Employee not found");
  }
  return employee;
}

// Not-found is a normal, expected outcome here (most users have no linked
// employee record) — callers use this for identity resolution (e.g.
// Bookings scoping a Driver to their own jobs), not validation, so it
// returns null instead of throwing.
export function getByUserId(companyId: string, userId: string) {
  return employeeRepository.findByUserIdScoped(companyId, userId);
}

// Cross-module read via Auth's service (not a re-query of `users`): confirms
// an optionally-supplied login account actually exists in this company
// before linking it to an employee record.
async function assertUserExists(companyId: string, userId: string) {
  await authService.getUserForCompany(companyId, userId);
}

export async function create(companyId: string, input: CreateEmployeeInput) {
  if (input.userId) {
    await assertUserExists(companyId, input.userId);
  }
  return employeeRepository.create(companyId, input);
}

export async function update(companyId: string, id: string, input: UpdateEmployeeInput, actorUserId?: string) {
  if (input.userId) {
    await assertUserExists(companyId, input.userId);
  }

  // Snapshot compensation before the change so a rate/type change is
  // auditable (Part 31/39). Historical *settled* driver earnings are frozen
  // via DriverPayment.earnedSnapshot; this record makes the rate change
  // itself traceable.
  const before = await employeeRepository.findByIdScoped(companyId, id);

  const updated = await employeeRepository.updateScoped(companyId, id, input);
  if (!updated) {
    throw new AppError(404, "Employee not found");
  }

  if (before) {
    const compChanged =
      (input.compensationType !== undefined && input.compensationType !== before.compensationType) ||
      (input.hourlyRate !== undefined && Number(input.hourlyRate) !== Number(before.hourlyRate ?? 0)) ||
      (input.perMinuteRate !== undefined && Number(input.perMinuteRate) !== Number(before.perMinuteRate ?? 0)) ||
      (input.monthlySalary !== undefined && Number(input.monthlySalary) !== Number(before.monthlySalary ?? 0)) ||
      (input.yearlySalary !== undefined && Number(input.yearlySalary) !== Number(before.yearlySalary ?? 0));

    if (compChanged) {
      await writeAudit({
        companyId,
        userId: actorUserId ?? null,
        entityType: "employee",
        entityId: id,
        action: "employee.compensation_changed",
        changes: {
          before: {
            compensationType: before.compensationType,
            hourlyRate: before.hourlyRate != null ? Number(before.hourlyRate) : null,
            perMinuteRate: before.perMinuteRate != null ? Number(before.perMinuteRate) : null,
            monthlySalary: before.monthlySalary != null ? Number(before.monthlySalary) : null,
            yearlySalary: before.yearlySalary != null ? Number(before.yearlySalary) : null,
          },
          after: {
            compensationType: updated.compensationType,
            hourlyRate: updated.hourlyRate != null ? Number(updated.hourlyRate) : null,
            perMinuteRate: updated.perMinuteRate != null ? Number(updated.perMinuteRate) : null,
            monthlySalary: updated.monthlySalary != null ? Number(updated.monthlySalary) : null,
            yearlySalary: updated.yearlySalary != null ? Number(updated.yearlySalary) : null,
          },
        },
      });
    }
  }

  return updated;
}

export async function remove(companyId: string, id: string) {
  // Rule 4 (§ dependency-locked deletion) — an Employee isn't referenced
  // by Booking directly, only via its optional Driver profile (Driver is
  // the FK Booking actually holds). No Driver profile means trivially no
  // bookings to block on. drivers.employee_id is separately ON DELETE
  // RESTRICT at the DB level regardless of booking history — that case
  // (a Driver profile exists at all, even with zero bookings) still
  // surfaces as a raw constraint error; not this feature's concern to
  // paper over, since "remove the Driver profile first" is already the
  // correct, self-explanatory fix for that one.
  const driver = await driverRepository.findByEmployeeIdScoped(companyId, id);
  if (driver) {
    const bookingCount = await bookingRepository.countByReference(companyId, { driverId: driver.id });
    assertNoBookingReferences("employee", bookingCount);
  }

  const deleted = await employeeRepository.deleteScoped(companyId, id);
  if (!deleted) {
    throw new AppError(404, "Employee not found");
  }
}
