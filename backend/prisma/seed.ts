import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Phase 1 is single-tenant by design (§2): exactly one company, with the
// 4 fixed system roles and their permission set from §6 pre-seeded as data.
// This is NOT the RBAC module's role-builder UI (deferred to Phase 2) — it's
// the minimum data every users.role_id / users.company_id foreign key needs
// to exist before Auth can create or log in a single user.

const PERMISSIONS = [
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
  {
    key: "operations.view",
    description: "Browse company-wide operational lists (villages, machines, employees, drivers, customers)",
  },
] as const;

// §6 permission table: Owner = everything; Manager = day-to-day field
// coordination; Driver = only their own job status; Farmer = none (their
// access is scoped to their own records by ownership, not by permission key).
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
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
    // Auth's registration bootstrap rule (approved separately) allows both
    // Owner and Manager to register new users once the company has one —
    // this is what that rule now checks via RBAC instead of a hardcoded
    // role-key comparison.
    "user.manage",
    // Master-data management (§8.1/§8.3 fields): §6 doesn't spell out who
    // maintains villages/machines/employees/customers as day-to-day admin
    // vs. Owner-only setup. Treated as Manager territory too, same as
    // user.manage above — Manager is the "primary field coordinator" and
    // in practice adds a new customer or village while booking a job, not
    // just Owner during initial setup. Flagged for review.
    "village.manage",
    "machine_type.manage",
    "machine.manage",
    "employee.manage",
    "driver.manage",
    "customer.manage",
    "operations.view",
  ],
  driver: ["job.update_status"],
  farmer: [],
};

const SYSTEM_ROLES = [
  { systemKey: "owner", name: "Owner" },
  { systemKey: "manager", name: "Manager" },
  { systemKey: "driver", name: "Driver" },
  { systemKey: "farmer", name: "Farmer" },
] as const;

const TERMINOLOGY_DEFAULTS = [
  { termKey: "customer", singular: "Customer", plural: "Customers" },
  { termKey: "driver", singular: "Driver", plural: "Drivers" },
  { termKey: "machine", singular: "Machine", plural: "Machines" },
  { termKey: "booking", singular: "Booking", plural: "Bookings" },
  { termKey: "invoice", singular: "Invoice", plural: "Invoices" },
] as const;

// §8.2: pricing methods are data, not application logic — seeded the same
// way roles/permissions are, so the Pricing Methods module needs no
// create/edit/delete API in Phase 1, only a read endpoint (§8.2 says a
// new method later should be a data change, not a code change; this is
// that same principle applied to the seed itself).
const PRICING_METHOD_DEFAULTS = [
  { key: "per_hour", label: "Per Hour", unit: "hour" },
  { key: "per_minute", label: "Per Minute", unit: "minute" },
  { key: "per_acre", label: "Per Acre", unit: "acre" },
  { key: "per_job", label: "Per Job (Fixed)", unit: null },
  { key: "minimum_charge", label: "Minimum Charge", unit: null },
  { key: "custom", label: "Custom Rate", unit: null },
] as const;

async function main() {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: p,
      }),
    ),
  );
  const permissionIdByKey = new Map(permissionRecords.map((p) => [p.key, p.id]));

  const company = await prisma.company.upsert({
    where: { slug: "pilot" },
    update: {},
    create: {
      name: "ShabooAgri Pilot Company",
      slug: "pilot",
    },
  });

  for (const term of TERMINOLOGY_DEFAULTS) {
    await prisma.terminologySetting.upsert({
      where: { companyId_termKey: { companyId: company.id, termKey: term.termKey } },
      update: {},
      create: {
        companyId: company.id,
        termKey: term.termKey,
        displayLabelSingular: term.singular,
        displayLabelPlural: term.plural,
      },
    });
  }

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { companyId_systemKey: { companyId: company.id, systemKey: roleDef.systemKey } },
      update: {},
      create: {
        companyId: company.id,
        systemKey: roleDef.systemKey,
        name: roleDef.name,
        isSystemRole: true,
      },
    });

    for (const permissionKey of ROLE_PERMISSIONS[roleDef.systemKey]) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  for (const method of PRICING_METHOD_DEFAULTS) {
    await prisma.pricingMethod.upsert({
      where: { companyId_key: { companyId: company.id, key: method.key } },
      update: { label: method.label, unit: method.unit },
      create: { companyId: company.id, key: method.key, label: method.label, unit: method.unit },
    });
  }

  console.log(`Seeded company "${company.name}" (${company.slug}) with 4 system roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
