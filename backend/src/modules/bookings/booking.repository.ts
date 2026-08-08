import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createScopedRepository } from "../../shared/db/scopedRepository";

// Only file in this module allowed to import the Prisma client.
const scoped = createScopedRepository(prisma.booking);

const includeRelations = {
  customer: true,
  village: true,
  machine: true,
  driver: true,
  // Never `manager: true` — that's the raw User row, passwordHash/pinHash
  // included. Select only the fields safe to hand back over the API.
  manager: {
    select: {
      id: true,
      companyId: true,
      roleId: true,
      fullName: true,
      email: true,
      mobileNumber: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  pricingMethod: true,
} satisfies Prisma.BookingInclude;

export interface BookingListFilter {
  driverId?: string;
  customerId?: string;
}

export function findAllForCompany(companyId: string, filter: BookingListFilter = {}) {
  return prisma.booking.findMany({
    where: { companyId, ...filter },
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.booking.findFirst({ where: { id, companyId }, include: includeRelations });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

// Sequential per company (BK-000001, BK-000002, ...) and strictly
// monotonic: companies.next_booking_number is only ever incremented, never
// read-and-recomputed from the bookings table, so a hard-deleted booking's
// number can never be reassigned. The increment itself is a single atomic
// UPDATE ("SET x = x + 1 RETURNING x") — Postgres serializes concurrent
// updates to the same row via its normal row lock, so two simultaneous
// booking creations still get two distinct numbers without needing an
// explicit transaction or a retry loop.
async function claimNextBookingNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { nextBookingNumber: { increment: 1 } },
    select: { nextBookingNumber: true },
  });
  const claimedNumber = company.nextBookingNumber - 1;
  return `BK-${String(claimedNumber).padStart(6, "0")}`;
}

export async function create(
  companyId: string,
  data: Omit<Prisma.BookingUncheckedCreateInput, "companyId" | "bookingNumber">,
) {
  const bookingNumber = await claimNextBookingNumber(companyId);
  return prisma.booking.create({
    data: { ...data, companyId, bookingNumber },
    include: includeRelations,
  });
}

// Returned with relations so callers (service layer computing
// estimatedAmount) never need a second round-trip after a write.
export async function updateScopedWithRelations(
  companyId: string,
  id: string,
  data: Prisma.BookingUncheckedUpdateInput,
) {
  const existing = await prisma.booking.findFirst({ where: { id, companyId } });
  if (!existing) return null;
  return prisma.booking.update({ where: { id }, data, include: includeRelations });
}

export function deleteScoped(companyId: string, id: string) {
  return scoped.deleteScoped(companyId, id);
}
