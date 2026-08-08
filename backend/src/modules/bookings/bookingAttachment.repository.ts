import { prisma } from "../../db/prisma";

export function findAllForBooking(companyId: string, bookingId: string) {
  return prisma.bookingAttachment.findMany({
    where: { companyId, bookingId },
    orderBy: { createdAt: "desc" },
  });
}

export function create(companyId: string, bookingId: string, fileUrl: string, uploadedBy: string) {
  return prisma.bookingAttachment.create({ data: { companyId, bookingId, fileUrl, uploadedBy } });
}
