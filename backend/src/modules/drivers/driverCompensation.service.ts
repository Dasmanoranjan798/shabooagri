import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";

export interface DriverCompensationSummary {
  driverId: string;
  driverName: string;
  roleTitle: string | null;
  compensationType: "HOURLY" | "MONTHLY" | "YEARLY";
  hourlyRate: number | null;
  monthlySalary: number | null;
  yearlySalary: number | null;
  totalCompletedJobs: number;
  totalWorkedHours: number;
  calculatedEarnings: number;
  explanation: string;
}

export async function getDriverCompensationSummary(
  companyId: string,
  driverId: string,
): Promise<DriverCompensationSummary> {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: {
      employee: true,
      jobs: {
        where: { status: "COMPLETED" },
        select: { actualHours: true },
      },
    },
  });

  if (!driver) {
    throw new AppError(404, "Driver not found");
  }

  const emp = driver.employee;
  const compType = emp.compensationType;
  const hourlyRate = emp.hourlyRate ? Number(emp.hourlyRate) : null;
  const monthlySalary = emp.monthlySalary ? Number(emp.monthlySalary) : null;
  const yearlySalary = emp.yearlySalary ? Number(emp.yearlySalary) : null;

  const totalCompletedJobs = driver.jobs.length;
  const totalWorkedHours = driver.jobs.reduce((sum, j) => sum + (j.actualHours ? Number(j.actualHours) : 0), 0);
  const roundedHours = Math.round(totalWorkedHours * 100) / 100;

  let calculatedEarnings = 0;
  let explanation = "";

  if (compType === "HOURLY") {
    const rate = hourlyRate ?? 0;
    calculatedEarnings = Math.round(roundedHours * rate * 100) / 100;
    explanation = `${roundedHours} worked hours × ₹${rate}/hr`;
  } else if (compType === "MONTHLY") {
    calculatedEarnings = monthlySalary ?? 0;
    explanation = `Fixed monthly salary: ₹${calculatedEarnings} (Job hours recorded: ${roundedHours} hrs)`;
  } else if (compType === "YEARLY") {
    calculatedEarnings = yearlySalary ?? 0;
    explanation = `Fixed annual salary: ₹${calculatedEarnings} (Job hours recorded: ${roundedHours} hrs)`;
  }

  return {
    driverId,
    driverName: emp.name,
    roleTitle: emp.roleTitle,
    compensationType: compType,
    hourlyRate,
    monthlySalary,
    yearlySalary,
    totalCompletedJobs,
    totalWorkedHours: roundedHours,
    calculatedEarnings,
    explanation,
  };
}
