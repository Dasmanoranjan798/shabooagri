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
  { key: "report.generate", description: "View/generate reports" },
  { key: "user.manage", description: "Create/edit/deactivate users" },
  { key: "settings.manage", description: "Change company settings" },
  { key: "data.export", description: "Export data" },
  { key: "village.manage", description: "Create/edit/delete villages" },
  { key: "machine_type.manage", description: "Create/edit/delete machine types" },
  { key: "machine.manage", description: "Create/edit/delete machines (fleet records, not booking assignment)" },
  { key: "employee.manage", description: "Create/edit/delete employee records" },
  { key: "driver.manage", description: "Create/edit/delete driver profiles (not booking assignment)" },
  { key: "customer.manage", description: "Create/edit/delete customer records" },
  { key: "expense.manage", description: "Create/edit/delete expense records" },
  { key: "maintenance.manage", description: "Log/edit/delete machine maintenance records and schedules" },
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
