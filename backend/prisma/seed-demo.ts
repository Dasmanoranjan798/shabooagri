import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log("Seeding real-world demo data for ShabooAgri Pilot Company...");

  // 1. Fetch pilot company
  const company = await prisma.company.findUnique({ where: { slug: "pilot" } });
  if (!company) throw new Error("Pilot company not found. Run main seed first.");

  // Update terminology to "Farmer" for Customer
  await prisma.terminologySetting.upsert({
    where: { companyId_termKey: { companyId: company.id, termKey: "customer" } },
    update: { displayLabelSingular: "Farmer", displayLabelPlural: "Farmers" },
    create: {
      companyId: company.id,
      termKey: "customer",
      displayLabelSingular: "Farmer",
      displayLabelPlural: "Farmers",
    },
  });

  const roles = await prisma.role.findMany({ where: { companyId: company.id } });
  const roleMap = new Map(roles.map((r) => [r.systemKey || r.name.toLowerCase(), r.id]));

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 2. Create Users
  const ownerUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "owner@shabooagri.com" } },
    update: { passwordHash },
    create: {
      companyId: company.id,
      roleId: roleMap.get("owner")!,
      fullName: "Pradeep Swain (Owner)",
      email: "owner@shabooagri.com",
      mobileNumber: "9999999999",
      passwordHash,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "manager@shabooagri.com" } },
    update: { passwordHash },
    create: {
      companyId: company.id,
      roleId: roleMap.get("manager")!,
      fullName: "Rajesh Kumar (Manager)",
      email: "manager@shabooagri.com",
      mobileNumber: "8888888888",
      passwordHash,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "driver@shabooagri.com" } },
    update: { passwordHash },
    create: {
      companyId: company.id,
      roleId: roleMap.get("driver")!,
      fullName: "Vikas Driver (Operator)",
      email: "driver@shabooagri.com",
      mobileNumber: "7777777777",
      passwordHash,
    },
  });

  // 3. Create Villages
  const vPuri = await prisma.village.upsert({
    where: { companyId_name: { companyId: company.id, name: "Puri Central" } },
    update: {},
    create: { companyId: company.id, name: "Puri Central" },
  });

  const vCuttack = await prisma.village.upsert({
    where: { companyId_name: { companyId: company.id, name: "Cuttack Rural" } },
    update: {},
    create: { companyId: company.id, name: "Cuttack Rural" },
  });

  // 4. Create Farmers / Customers
  const farmerRamesh = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Ramesh Behera",
      phone: "9876543210",
      villageId: vPuri.id,
      notes: "Paddy farmer - 5 acres field",
    },
  });

  const farmerSuresh = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Suresh Mohanty",
      phone: "9876543211",
      villageId: vCuttack.id,
      notes: "Rotavation & Harvester required seasonally",
    },
  });

  // 5. Create Machine Types & Machines
  const mtHarvester = await prisma.machineType.upsert({
    where: { companyId_name: { companyId: company.id, name: "Combine Harvester" } },
    update: {},
    create: { companyId: company.id, name: "Combine Harvester" },
  });

  const mtTractor = await prisma.machineType.upsert({
    where: { companyId_name: { companyId: company.id, name: "Tractor 55HP" } },
    update: {},
    create: { companyId: company.id, name: "Tractor 55HP" },
  });

  const machineHarvester = await prisma.machine.upsert({
    where: { companyId_registrationNumber: { companyId: company.id, registrationNumber: "OD-02-AX-1001" } },
    update: {},
    create: {
      companyId: company.id,
      machineTypeId: mtHarvester.id,
      registrationNumber: "OD-02-AX-1001",
      brand: "John Deere",
      model: "W70 Harvester",
      purchaseYear: 2023,
      fuelType: "DIESEL",
      status: "WORKING",
      hourMeterReading: 420.5,
    },
  });

  const machineTractor = await prisma.machine.upsert({
    where: { companyId_registrationNumber: { companyId: company.id, registrationNumber: "OD-02-AX-2002" } },
    update: {},
    create: {
      companyId: company.id,
      machineTypeId: mtTractor.id,
      registrationNumber: "OD-02-AX-2002",
      brand: "Mahindra",
      model: "575 DI",
      purchaseYear: 2022,
      fuelType: "DIESEL",
      status: "AVAILABLE",
      hourMeterReading: 890.0,
    },
  });

  // 6. Create Employees & Drivers with Compensation Models
  const empHourly = await prisma.employee.create({
    data: {
      companyId: company.id,
      name: "Vikas Driver",
      phone: "7777777777",
      userId: driverUser.id,
      roleTitle: "Senior Operator",
      compensationType: "HOURLY",
      hourlyRate: 300,
    },
  });
  const driverVikas = await prisma.driver.create({
    data: { companyId: company.id, employeeId: empHourly.id },
  });

  const empMonthly = await prisma.employee.create({
    data: {
      companyId: company.id,
      name: "Sunil Operator",
      phone: "7777777778",
      roleTitle: "Harvester Specialist",
      compensationType: "MONTHLY",
      monthlySalary: 25000,
    },
  });
  const driverSunil = await prisma.driver.create({
    data: { companyId: company.id, employeeId: empMonthly.id },
  });

  const empYearly = await prisma.employee.create({
    data: {
      companyId: company.id,
      name: "Amit Manager-Operator",
      phone: "7777777779",
      roleTitle: "Lead Fleet Driver",
      compensationType: "YEARLY",
      yearlySalary: 360000,
    },
  });
  const driverAmit = await prisma.driver.create({
    data: { companyId: company.id, employeeId: empYearly.id },
  });

  console.log(" Real-world demo data seeded successfully.");
  console.log("--------------------------------------------------");
  console.log("Demo Owner Login:   owner@shabooagri.com / Password123! (or 9999999999)");
  console.log("Demo Manager Login: manager@shabooagri.com / Password123! (or 8888888888)");
  console.log("Demo Driver Login:  driver@shabooagri.com / Password123! (or 7777777777)");
  console.log("--------------------------------------------------");
}

seedDemoData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
