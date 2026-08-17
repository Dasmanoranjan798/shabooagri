// Single source of truth for "what does a brand-new company need to exist
// before Auth can create or log in a single user" — the 4 system roles,
// their permission sets (§6), and the default pricing methods (§8.2).
// Used by prisma/seed.ts (bootstraps the pilot company) and by
// modules/internal (provisions a company for a new platform customer) so
// the two never drift out of sync with each other.

export const PERMISSIONS = [
  { key: "dashboard.view", description: "View dashboard metrics" },
  { key: "booking.create", description: "Create a booking" },
  { key: "booking.edit", description: "Edit a booking" },
  { key: "booking.delete", description: "Cancel/delete a booking" },
  { key: "machine.assign", description: "Assign a machine to a booking" },
  { key: "driver.assign", description: "Assign a driver to a booking" },
  { key: "job.update_status", description: "Record job execution progress (start/pause/complete, hours, acres, fuel)" },
  { key: "payment.receive", description: "Record a payment against an invoice" },
  // Void, not delete (§ dependency-locked deletion) — reversing a payment
  // or invoice while keeping it permanently visible in history/reports.
  // Owner-only: not granted to manager below.
  { key: "payment.void", description: "Void a payment or invoice (Owner only)" },
  { key: "report.generate", description: "View/generate reports" },
  { key: "user.manage", description: "Create/edit/deactivate users" },
  { key: "settings.manage", description: "Change company settings" },
  { key: "data.export", description: "Export data" },
  // "*.manage" now covers create/edit only — hard-delete for these five
  // master-data types moved to its own Owner-only "*.delete" permission
  // below, per the dependency-locked deletion rules (a Manager may still
  // deactivate/mark unavailable via *.manage, never hard-delete).
  { key: "village.manage", description: "Create/edit villages; mark active/inactive" },
  { key: "machine_type.manage", description: "Create/edit/delete machine types" },
  { key: "machine.manage", description: "Create/edit machines (fleet records, not booking assignment); mark active/inactive" },
  { key: "employee.manage", description: "Create/edit employee records; mark active/inactive" },
  { key: "driver.manage", description: "Create/edit driver profiles (not booking assignment); mark unavailable" },
  { key: "customer.manage", description: "Create/edit customer records; mark active/inactive" },
  { key: "expense.manage", description: "Create/edit/delete expense records" },
  { key: "maintenance.manage", description: "Log/edit/delete machine maintenance records and schedules" },
  { key: "village.delete", description: "Hard-delete a village with no linked bookings (Owner only)" },
  { key: "machine.delete", description: "Hard-delete a machine with no linked bookings (Owner only)" },
  { key: "employee.delete", description: "Hard-delete an employee with no linked bookings (Owner only)" },
  { key: "driver.delete", description: "Hard-delete a driver profile with no linked bookings (Owner only)" },
  { key: "customer.delete", description: "Hard-delete a customer with no linked bookings (Owner only)" },
  // Cancelling a Job (distinct from the normal start/pause/complete
  // lifecycle) is Owner-only because it can only happen after voiding any
  // linked payment — a deliberately rare, corrective action.
  { key: "job.cancel", description: "Cancel a job (Owner only)" },
  {
    key: "operations.view",
    description: "Browse company-wide operational lists (villages, machines, employees, drivers, customers)",
  },
] as const;

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  owner: PERMISSIONS.map((p) => p.key),
  manager: [
    "dashboard.view",
    "booking.create",
    "booking.edit",
    "machine.assign",
    "driver.assign",
    "job.update_status",
    "payment.receive",
    "report.generate",
    "user.manage",
    "village.manage",
    "machine_type.manage",
    "machine.manage",
    "employee.manage",
    "driver.manage",
    "customer.manage",
    "expense.manage",
    "maintenance.manage",
    "operations.view",
  ],
  driver: ["job.update_status"],
  farmer: [],
};

export const SYSTEM_ROLES = [
  { systemKey: "owner", name: "Owner" },
  { systemKey: "manager", name: "Manager" },
  { systemKey: "driver", name: "Driver" },
  { systemKey: "farmer", name: "Farmer" },
] as const;

export const TERMINOLOGY_DEFAULTS = [
  { termKey: "customer", singular: "Customer", plural: "Customers" },
  { termKey: "driver", singular: "Driver", plural: "Drivers" },
  { termKey: "machine", singular: "Machine", plural: "Machines" },
  { termKey: "booking", singular: "Booking", plural: "Bookings" },
  { termKey: "invoice", singular: "Invoice", plural: "Invoices" },
] as const;

export const PRICING_METHOD_DEFAULTS = [
  { key: "per_hour", label: "Per Hour", unit: "hour" },
  { key: "per_minute", label: "Per Minute", unit: "minute" },
  { key: "per_acre", label: "Per Acre", unit: "acre" },
  { key: "per_job", label: "Per Job (Fixed)", unit: null },
  { key: "minimum_charge", label: "Minimum Charge", unit: null },
  { key: "custom", label: "Custom Rate", unit: null },
] as const;
