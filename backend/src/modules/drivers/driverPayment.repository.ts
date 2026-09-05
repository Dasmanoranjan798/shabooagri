import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function findAllForDriver(companyId: string, driverId: string) {
  return prisma.driverPayment.findMany({
    where: { companyId, driverId },
    orderBy: { paidAt: "desc" },
  });
}

// Sum of non-cancelled payments to a driver — the "total paid" that offsets
// live earnings to give remaining payable.
export async function sumNonCancelledForDriver(companyId: string, driverId: string): Promise<number> {
  const result = await prisma.driverPayment.aggregate({
    where: { companyId, driverId, cancelled: false },
    _sum: { amount: true },
  });
  return result._sum.amount != null ? Number(result._sum.amount) : 0;
}

export function findByIdScoped(companyId: string, id: string) {
  return prisma.driverPayment.findFirst({ where: { id, companyId } });
}

export function create(
  companyId: string,
  data: Omit<Prisma.DriverPaymentUncheckedCreateInput, "companyId">,
) {
  return prisma.driverPayment.create({ data: { ...data, companyId } });
}

export function cancelPayment(companyId: string, id: string, reason: string, cancelledBy: string) {
  return prisma.driverPayment.updateMany({
    where: { id, companyId, cancelled: false },
    data: { cancelled: true, cancelReason: reason, cancelledAt: new Date(), cancelledBy },
  });
}
