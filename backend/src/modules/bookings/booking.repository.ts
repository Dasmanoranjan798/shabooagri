import { Prisma } from "@prisma/client";
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

const MAX_BOOKING_NUMBER_ATTEMPTS = 5;

// Sequential per company (BK-000001, BK-000002, ...). Phase 1 is a single
// pilot company at low concurrency, so count-then-retry-on-conflict is
// sufficient; a genuinely concurrency-safe generator (a DB sequence per
// company) is a Phase 2 concern if simultaneous booking creation ever makes
// the race likely in practice.
async function generateBookingNumber(companyId: string): Promise<string> {
  const count = await prisma.booking.count({ where: { companyId } });
  return `BK-${String(count + 1).padStart(6, "0")}`;
}

function isDuplicateBookingNumberError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    ((err.meta?.target as string[] | undefined)?.includes("booking_number") ?? false)
  );
}

export async function create(
  companyId: string,
  data: Omit<Prisma.BookingUncheckedCreateInput, "companyId" | "bookingNumber">,
) {
  for (let attempt = 0; attempt < MAX_BOOKING_NUMBER_ATTEMPTS; attempt++) {
    const bookingNumber = await generateBookingNumber(companyId);
    try {
      return await prisma.booking.create({
        data: { ...data, companyId, bookingNumber },
        include: includeRelations,
      });
    } catch (err) {
      if (!isDuplicateBookingNumberError(err) || attempt === MAX_BOOKING_NUMBER_ATTEMPTS - 1) {
        throw err;
      }
    }
  }
  throw new Error("Failed to generate a unique booking number");
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
