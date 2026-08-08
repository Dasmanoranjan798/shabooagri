import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import * as customerService from "../../modules/customers/customer.service";
import * as driverService from "../../modules/drivers/driver.service";
import * as employeeService from "../../modules/employees/employee.service";
import * as rbacService from "../../modules/rbac/rbac.service";

// Shared by any module whose data is visible to all 4 roles at different
// scope (first used by Bookings, now Jobs too): Owner/Manager
// (operations.view) see the whole company; a Driver sees only records
// linked to their own Driver profile; a Farmer sees only records linked to
// their own Customer record; anyone with neither sees nothing. Resolution
// is by data linkage (does this user have a Driver/Customer record) and by
// permission (operations.view), never by hardcoding a role key — a second
// module needing this exact rule was the signal to extract it here instead
// of copying booking.service.ts's version (§3: no duplicated logic).
export type CallerScope =
  | { kind: "company" }
  | { kind: "driver"; driverId: string }
  | { kind: "customer"; customerId: string }
  | { kind: "none" };

export async function resolveCallerScope(companyId: string, user: AuthenticatedUser): Promise<CallerScope> {
  const hasCompanyView = await rbacService.userHasPermission(user.roleId, "operations.view");
  if (hasCompanyView) {
    return { kind: "company" };
  }

  const employee = await employeeService.getByUserId(companyId, user.id);
  if (employee) {
    const driver = await driverService.getByEmployeeId(companyId, employee.id);
    if (driver) {
      return { kind: "driver", driverId: driver.id };
    }
  }

  const customer = await customerService.getByUserId(companyId, user.id);
  if (customer) {
    return { kind: "customer", customerId: customer.id };
  }

  return { kind: "none" };
}
