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

  // Create Company B for multi-tenant cross-company test
  const companyB = await prisma.company.create({
    data: {
      name: `Company Beta ${testSuffix}`,
      slug: `beta-${testSuffix}`,
    },
  });

  const villageA = await prisma.village.create({
    data: { companyId: companyA.id, name: `Village A ${testSuffix}` },
  });
  const villageB = await prisma.village.create({
    data: { companyId: companyB.id, name: `Village B ${testSuffix}` },
  });

  const machineTypeA = await prisma.machineType.create({
    data: { companyId: companyA.id, name: `Tractor A ${testSuffix}` },
  });
  const machineTypeB = await prisma.machineType.create({
    data: { companyId: companyB.id, name: `Tractor B ${testSuffix}` },
  });

  const machineA = await prisma.machine.create({
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
  const farmerUserA = await authService.register({
    fullName: `Farmer A ${testSuffix}`,
    email: `farmerA_${testSuffix}@example.com`,
    password: "Password123!",
    roleKey: "farmer",
  }, requestingOwner);

  const customerA = await customerService.create(companyA.id, {
    name: `Farmer A ${testSuffix}`,
    villageId: villageA.id,
    userId: farmerUserA.user.id,
  });

  // 2. Create Farmer User B in Company A
  const farmerUserB = await authService.register({
    fullName: `Farmer B ${testSuffix}`,
    email: `farmerB_${testSuffix}@example.com`,
    password: "Password123!",
    roleKey: "farmer",
  }, requestingOwner);

  const customerB = await customerService.create(companyA.id, {
    name: `Farmer B ${testSuffix}`,
    villageId: villageA.id,
    userId: farmerUserB.user.id,
  });

  // 3. Create Booking for Farmer A and Booking for Farmer B
  const bookingA = await bookingService.create(companyA.id, ownerUser.id, {
    customerId: customerA.id,
    villageId: villageA.id,
    machineId: machineA.id,
    scheduledDate: new Date(),
    pricingMethodId: pmA.id,
    rate: 500,
    estimatedHours: 2,
  });

  const bookingB = await bookingService.create(companyA.id, ownerUser.id, {
    customerId: customerB.id,
    villageId: villageA.id,
    machineId: machineA.id,
    scheduledDate: new Date(Date.now() + 86400000),
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
  const containsOtherCustomerInvoice = farmerAInvoices.some((inv) => inv.customerId !== customerA.id);
  if (containsOtherCustomerInvoice) {
    throw new Error("Farmer A received invoices belonging to another customer!");
  }
  console.log(" Farmer A invoice list strictly scoped to Farmer A's customerId");

  console.log("\n==================================================");
  console.log(" FARMER PORTAL & DATA ISOLATION SECURITY PASSED!");
  console.log("==================================================");
}

runFarmerPortalSecurityTest()
  .catch((err) => {
    console.error("Farmer Security Test Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
