import { prisma } from "../src/db/prisma";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as authService from "../src/modules/auth/auth.service";
import * as bookingService from "../src/modules/bookings/booking.service";
import * as customerService from "../src/modules/customers/customer.service";
import * as paymentService from "../src/modules/payments/payment.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";
import { AppError } from "../src/shared/errors/AppError";

async function runFarmerPortalSecurityTest() {
  console.log("==================================================");
  console.log("STARTING FARMER PORTAL & DATA ISOLATION SECURITY TEST");
  console.log("==================================================");

  const companyA = await authRepository.findSingleTenantCompany();
  const testSuffix = Date.now().toString();

  // Declared outside the try so the finally block can clean up whatever DID
  // get created even if setup or an assertion throws partway through — this
  // suite writes directly into the shared pilot company (companyA), so a run
  // that crashes halfway must not leave synthetic villages/machines/
  // customers/bookings/users behind in it.
  let companyB: { id: string } | null = null;
  let villageA: { id: string } | null = null;
  let villageB: { id: string } | null = null;
  let machineTypeA: { id: string } | null = null;
  let machineTypeB: { id: string } | null = null;
  let machineA: { id: string } | null = null;
  let farmerUserA: Awaited<ReturnType<typeof authService.register>> | null = null;
  let farmerUserB: Awaited<ReturnType<typeof authService.register>> | null = null;
  let customerA: { id: string } | null = null;
  let customerB: { id: string } | null = null;
  let bookingA: { id: string } | null = null;
  let bookingB: { id: string } | null = null;

  try {
    // Create Company B for multi-tenant cross-company test
    companyB = await prisma.company.create({
      data: {
        name: `Company Beta ${testSuffix}`,
        slug: `beta-${testSuffix}`,
      },
    });

    villageA = await prisma.village.create({
      data: { companyId: companyA.id, name: `Village A ${testSuffix}` },
    });
    villageB = await prisma.village.create({
      data: { companyId: companyB.id, name: `Village B ${testSuffix}` },
    });

    machineTypeA = await prisma.machineType.create({
      data: { companyId: companyA.id, name: `Tractor A ${testSuffix}` },
    });
    machineTypeB = await prisma.machineType.create({
      data: { companyId: companyB.id, name: `Tractor B ${testSuffix}` },
    });

    machineA = await prisma.machine.create({
      data: { companyId: companyA.id, machineTypeId: machineTypeA.id, registrationNumber: `REG-A-${testSuffix}` },
    });

    const pmA = await prisma.pricingMethod.findFirstOrThrow({ where: { companyId: companyA.id, key: "per_hour" } });

    const ownerUser = await prisma.user.findFirstOrThrow({
      where: { companyId: companyA.id, role: { systemKey: "owner" } },
    });

    const requestingOwner: AuthenticatedUser = {
      id: ownerUser.id,
      companyId: companyA.id,
      roleId: ownerUser.roleId,
      isOwner: true,
      permissions: ["user.manage"],
    };

    // 1. Create Farmer User A in Company A
    farmerUserA = await authService.register({
      fullName: `Farmer A ${testSuffix}`,
      email: `farmerA_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "farmer",
    }, requestingOwner);

    customerA = await customerService.create(companyA.id, {
      name: `Farmer A ${testSuffix}`,
      villageId: villageA.id,
      userId: farmerUserA.user.id,
    });

    // 2. Create Farmer User B in Company A
    farmerUserB = await authService.register({
      fullName: `Farmer B ${testSuffix}`,
      email: `farmerB_${testSuffix}@example.com`,
      password: "Password123!",
      roleKey: "farmer",
    }, requestingOwner);

    customerB = await customerService.create(companyA.id, {
      name: `Farmer B ${testSuffix}`,
      villageId: villageA.id,
      userId: farmerUserB.user.id,
    });

    // 3. Create Booking for Farmer A and Booking for Farmer B
    bookingA = await bookingService.create(companyA.id, ownerUser.id, {
      customerId: customerA.id,
      villageId: villageA.id,
      machineId: machineA.id,
      scheduledDate: new Date(),
      workDescription: "Test field work A",
      pricingMethodId: pmA.id,
      rate: 500,
      estimatedHours: 2,
    });

    bookingB = await bookingService.create(companyA.id, ownerUser.id, {
      customerId: customerB.id,
      villageId: villageA.id,
      machineId: machineA.id,
      scheduledDate: new Date(Date.now() + 86400000),
      workDescription: "Test field work B",
      pricingMethodId: pmA.id,
      rate: 500,
      estimatedHours: 2,
    });

    const authFarmerA: AuthenticatedUser = {
      id: farmerUserA.user.id,
      companyId: companyA.id,
      roleId: farmerUserA.user.roleId,
      isOwner: false,
      permissions: [], // Portal farmer has 0 admin permissions
    };

    // TEST 1: Farmer A lists bookings -> must contain ONLY Booking A
    console.log("\n[TEST 1] Testing Farmer A Bookings List Isolation...");
    const farmerABookings = await bookingService.list(companyA.id, authFarmerA);
    if (farmerABookings.length !== 1 || farmerABookings[0].id !== bookingA.id) {
      throw new Error(`Farmer A should see exactly 1 booking (Booking A), but saw ${farmerABookings.length}`);
    }
    console.log(" Farmer A lists ONLY their own booking (Booking A)");

    // TEST 2: Farmer A tries to fetch Booking B directly -> must return 404 Not Found
    console.log("\n[TEST 2] Testing Farmer A Direct Read of Farmer B's Booking...");
    try {
      await bookingService.getById(companyA.id, bookingB.id, authFarmerA);
      throw new Error("Farmer A should NOT be able to view Farmer B's booking!");
    } catch (err: any) {
      if (err.statusCode === 404 || err.message.includes("not found")) {
        console.log(" Farmer A direct read of Farmer B's booking rejected cleanly with 404 Not Found");
      } else {
        throw err;
      }
    }

    // TEST 3: Farmer A tries to read invoices -> scoped strictly to Farmer A
    console.log("\n[TEST 3] Testing Farmer A Invoice Scoping...");
    const farmerAInvoices = await paymentService.listInvoices(companyA.id, authFarmerA);
    const containsOtherCustomerInvoice = farmerAInvoices.some((inv) => inv.customerId !== customerA!.id);
    if (containsOtherCustomerInvoice) {
      throw new Error("Farmer A received invoices belonging to another customer!");
    }
    console.log(" Farmer A invoice list strictly scoped to Farmer A's customerId");

    console.log("\n==================================================");
    console.log(" FARMER PORTAL & DATA ISOLATION SECURITY PASSED!");
    console.log("==================================================");
  } finally {
    console.log("Cleaning up synthetic test data...");

    // companyA is pilot (real, shared) — every delete on that side is scoped
    // to the specific rows this run created, never to companyId wholesale.
    // companyB is fully disposable (created solely for this run), so it's
    // safe to clear by companyId before dropping the company row itself.
    if (bookingA) await prisma.booking.deleteMany({ where: { id: bookingA.id } });
    if (bookingB) await prisma.booking.deleteMany({ where: { id: bookingB.id } });
    if (customerA) await prisma.customer.deleteMany({ where: { id: customerA.id } });
    if (customerB) await prisma.customer.deleteMany({ where: { id: customerB.id } });
    if (machineA) await prisma.machine.deleteMany({ where: { id: machineA.id } });
    if (machineTypeA) await prisma.machineType.deleteMany({ where: { id: machineTypeA.id } });
    if (villageA) await prisma.village.deleteMany({ where: { id: villageA.id } });

    const userIds = [farmerUserA?.user.id, farmerUserB?.user.id].filter((id): id is string => !!id);
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    if (companyB) {
      if (machineTypeB) await prisma.machine.deleteMany({ where: { companyId: companyB.id } });
      if (machineTypeB) await prisma.machineType.deleteMany({ where: { companyId: companyB.id } });
      if (villageB) await prisma.village.deleteMany({ where: { companyId: companyB.id } });
      await prisma.company.deleteMany({ where: { id: companyB.id } });
    }

    console.log("Cleanup complete.");
  }
}

runFarmerPortalSecurityTest()
  .catch((err) => {
    console.error("Farmer Security Test Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
