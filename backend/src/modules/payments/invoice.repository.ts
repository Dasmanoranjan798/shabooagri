import type { FilterInvoicesInput } from "./payment.validators";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/AppError";
import { createScopedRepository } from "../../shared/db/scopedRepository";

const scoped = createScopedRepository(prisma.invoice);

export const invoiceIncludeRelations = {
  customer: {
    include: {
      village: true,
    },
  },
  booking: {
    include: {
      machine: true,
      driver: {
        include: {
          employee: true,
        },
      },
      pricingMethod: true,
    },
  },
  payments: {
    include: {
      receiver: {
        select: {
          id: true,
          fullName: true,
          email: true,
          mobileNumber: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.InvoiceInclude;

export interface InvoiceListFilter {
  customerId?: string;
  bookingId?: string;
}

export function findAllForCompany(companyId: string, filter: InvoiceListFilter = {}) {
  return prisma.invoice.findMany({
    where: { companyId, ...filter },
    include: invoiceIncludeRelations,
    orderBy: { createdAt: "desc" },
  });
}

// Oldest-first so a customer payment/advance settles the longest-standing
// debt before newer invoices — standard "apply against open balance" order.
export function findOutstandingForCustomer(companyId: string, customerId: string) {
  return prisma.invoice.findMany({
    where: { companyId, customerId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    orderBy: { invoiceDate: "asc" },
  });
}

export function findByIdScopedWithRelations(companyId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, companyId },
    include: invoiceIncludeRelations,
  });
}

export function findByIdScoped(companyId: string, id: string) {
  return scoped.findByIdScoped(companyId, id);
}

export function findByBookingIdScoped(
  companyId: string,
  bookingId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.invoice.findFirst({
    where: { companyId, bookingId },
    include: invoiceIncludeRelations,
  });
}

// Sequential per company (INV-000001, INV-000002, ...) and strictly
// monotonic: companies.next_invoice_number is only ever incremented, never
// read-and-recomputed from the invoices table, so a hard-deleted invoice's
// number can never be reassigned. The increment itself is a single atomic
// UPDATE ("SET x = x + 1 RETURNING x") — Postgres serializes concurrent
// updates to the same row via its normal row lock, so two simultaneous
// invoice creations still get two distinct numbers without needing an
// explicit transaction or a retry loop.
export async function claimNextInvoiceNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true, invoicePrefix: true },
  });
  const claimedNumber = company.nextInvoiceNumber - 1;
  const prefix = company.invoicePrefix || "INV";
  return `${prefix}-${String(claimedNumber).padStart(6, "0")}`;
}

export async function create(
  companyId: string,
  data: Omit<Prisma.InvoiceUncheckedCreateInput, "companyId" | "invoiceNumber">,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const invoiceNumber = await claimNextInvoiceNumber(companyId);
  return tx.invoice.create({
    data: { ...data, companyId, invoiceNumber },
    include: invoiceIncludeRelations,
  });
}

// Void, not delete (§ dependency-locked deletion) — an Invoice stays
// permanently in history/reports with status VOIDED instead of being
// removed. No deleteScoped export exists on this repository on purpose.
//
// Cascades to every non-voided Payment under this invoice: an invoice
// voided as a whole must also stop each of its payments counting toward
// revenue (payment.repository.ts's sum* queries filter on `voided`, not
// on the parent invoice's status), so leaving them un-voided would let a
// "Voided" invoice keep contributing to reported revenue. Each payment
// keeps its own voidReason distinct from the invoice's, prefixed so the
// cascade is traceable from the payment side too.
export async function voidScoped(companyId: string, id: string, reason: string, voidedBy: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { id, companyId } });
    if (!existing) return null;
    if (existing.status === "VOIDED") {
      throw new AppError(400, "This invoice has already been voided");
    }

    await tx.payment.updateMany({
      where: { invoiceId: id, voided: false },
      data: { voided: true, voidReason: `Invoice voided: ${reason}`, voidedAt: new Date(), voidedBy },
    });

    return tx.invoice.update({
      where: { id },
      data: { status: "VOIDED", voidReason: reason, voidedAt: new Date(), voidedBy },
      include: invoiceIncludeRelations,
    });
  });
}

export async function filterInvoicesWithAnalytics(
  companyId: string, 
  input: FilterInvoicesInput, 
  userScopeOptions?: { customerId?: string }
) {
  const where: Prisma.InvoiceWhereInput = { companyId };
  
  if (userScopeOptions?.customerId) {
    where.customerId = userScopeOptions.customerId;
  }
  
  // Status filter (including virtual 'OVERDUE', 'DUE_TODAY', 'DUE_SOON')
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const soonEnd = new Date(todayStart);
  soonEnd.setDate(soonEnd.getDate() + 7);

  let statusIn: string[] = [];
  let includeOverdue = false;
  let includeDueToday = false;
  let includeDueSoon = false;

  if (input.status && input.status.length > 0) {
    const statuses = new Set(input.status.map(s => s.toUpperCase()));
    if (statuses.has("ALL")) {
      // no status filter
    } else {
      if (statuses.has("OVERDUE")) includeOverdue = true;
      if (statuses.has("DUE_TODAY")) includeDueToday = true;
      if (statuses.has("DUE_SOON")) includeDueSoon = true;
      
      const dbStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "VOIDED"].filter(s => statuses.has(s));
      statusIn = dbStatuses;
      
      const orConditions: Prisma.InvoiceWhereInput[] = [];
      if (statusIn.length > 0) {
        orConditions.push({ status: { in: statusIn as any } });
      }
      if (includeOverdue) {
        orConditions.push({ 
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { lt: todayStart }
        });
      }
      if (includeDueToday) {
        orConditions.push({
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { gte: todayStart, lt: todayEnd }
        });
      }
      if (includeDueSoon) {
        orConditions.push({
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { gte: todayEnd, lt: soonEnd }
        });
      }
      if (orConditions.length > 0) {
        if (where.OR) {
          where.AND = [ { OR: where.OR }, { OR: orConditions } ];
          delete where.OR;
        } else {
          where.OR = orConditions;
        }
      }
    }
  }

  // Date Range
  if (input.dateRange && input.dateRange.field) {
    const { field, from, to } = input.dateRange;
    let dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
       const toDate = new Date(to);
       toDate.setDate(toDate.getDate() + 1);
       dateFilter.lt = toDate;
    }
    
    if (Object.keys(dateFilter).length > 0) {
      if (field === "invoiceDate") {
        where.invoiceDate = dateFilter;
      } else if (field === "dueDate") {
        where.dueDate = dateFilter;
      } else if (field === "paymentDate") {
        where.payments = { some: { receivedAt: dateFilter, voided: false } };
      } else if (field === "workCompletionDate") {
        where.booking = { job: { status: "COMPLETED", endTime: dateFilter } };
      }
    }
  }

  // Related entities
  if (input.customerId && input.customerId.length > 0) {
    where.customerId = { in: input.customerId };
  }
  if (input.villageId && input.villageId.length > 0) {
    where.customer = { villageId: { in: input.villageId } };
  }
  if (input.machineId && input.machineId.length > 0) {
    where.booking = { ...((where.booking as any) || {}), machineId: { in: input.machineId } };
  }
  if (input.driverId && input.driverId.length > 0) {
    where.booking = { ...((where.booking as any) || {}), assignedDriverId: { in: input.driverId } };
  }

  if (input.paymentMethod && input.paymentMethod.length > 0) {
    where.payments = { ...((where.payments as any) || {}), some: { 
      ...(((where.payments as any)?.some) || {}),
      paymentMethod: { in: input.paymentMethod } 
    }};
  }

  if (input.amountFilter && input.amountFilter.field && input.amountFilter.operator) {
    const { field, operator, value, valueMax } = input.amountFilter;
    if (value !== undefined) {
      const amountCond: any = {};
      if (operator === "gt") amountCond.gt = value;
      else if (operator === "lt") amountCond.lt = value;
      else if (operator === "eq") amountCond.equals = value;
      else if (operator === "between" && valueMax !== undefined) {
        amountCond.gte = value;
        amountCond.lte = valueMax;
      }
      if (Object.keys(amountCond).length > 0) {
         if (field === "totalAmount") where.totalAmount = amountCond;
         else if (field === "paidAmount") where.paidAmount = amountCond;
         else if (field === "balanceAmount") where.balanceAmount = amountCond;
      }
    }
  }

  if (input.outstandingAge) {
    const minD = input.outstandingAge.minDays;
    const maxD = input.outstandingAge.maxDays;
    
    let ageCond: any = {};
    if (minD !== undefined) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - minD);
      ageCond.lt = d; // due before X days ago
    }
    if (maxD !== undefined) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - maxD);
      ageCond.gte = d; // due after or on Y days ago
    }
    if (Object.keys(ageCond).length > 0) {
      where.status = { in: ["UNPAID", "PARTIALLY_PAID"] };
      where.dueDate = ageCond;
    }
  }

  const [totalCount, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: invoiceIncludeRelations,
      orderBy: { createdAt: "desc" },
    }) // We skip pagination for the summary calculations, or we apply pagination after fetching all?
       // Wait, "The Flutter application should display the filtered result returned by the backend."
       // If we paginate, the UI might need the full list or we just return all matching invoices.
       // "For large datasets, do not blindly download the entire database to Flutter just to filter it locally."
       // But if we want day-wise analysis and summaries, we can do it in SQL or just JS on the server if it's not huge.
       // Let's just fetch all matching from DB. It's safer for Phase 1.
  ]);

  // Analytics
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let invoicesCount = invoices.length;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueSoonCount = 0;

  const dayWiseMap = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const customerMap = new Map<string, { invoiced: number; paid: number; outstanding: number; name: string }>();
  const villageMap = new Map<string, { outstanding: number; name: string }>();

  for (const inv of invoices) {
    const total = Number(inv.totalAmount || 0);
    const paid = Number(inv.paidAmount || 0);
    const balance = Number(inv.balanceAmount || 0);

    totalInvoiced += total;
    totalPaid += paid;
    totalOutstanding += balance;

    if (inv.status === "PAID") paidCount++;
    else if (inv.status === "PARTIALLY_PAID") partialCount++;
    else if (inv.status === "UNPAID") unpaidCount++;

    let isOverdue = false;
    if (inv.dueDate && balance > 0) {
      const due = new Date(inv.dueDate);
      if (due < todayStart) {
        isOverdue = true;
        overdueCount++;
        overdueAmount += balance;
      } else if (due >= todayStart && due < todayEnd) {
        dueTodayCount++;
      } else if (due >= todayEnd && due < soonEnd) {
        dueSoonCount++;
      }
    }

    // Customer map
    if (inv.customer) {
      const cid = inv.customerId;
      if (!customerMap.has(cid)) {
        customerMap.set(cid, { invoiced: 0, paid: 0, outstanding: 0, name: inv.customer.name });
      }
      const cStat = customerMap.get(cid)!;
      cStat.invoiced += total;
      cStat.paid += paid;
      cStat.outstanding += balance;
      
      if (inv.customer.village) {
        const vid = inv.customer.villageId;
        if (vid) {
           if (!villageMap.has(vid)) {
             villageMap.set(vid, { outstanding: 0, name: inv.customer.village.name });
           }
           villageMap.get(vid)!.outstanding += balance;
        }
      }
    }
  }

  // Payment Day-wise & Method-wise (Only considering payments for these filtered invoices)
  // Wait, if filter is DateRange = This Month, and date field is "Invoice Date", 
  // then the day-wise payment collection should probably only include payments made within that same date range?
  // "The owner specifically needs day-wise collection analysis. Provide a day-wise view based on actual payment dates."
  // Let's fetch payments that belong to these invoices, but only if they match the date filter (if it's a paymentDate filter).
  // Actually, to be robust, we fetch all payments for these invoices that are not voided, 
  // and if a paymentDate filter was applied, we only include payments in that range.
  
  const pRange = (input.dateRange?.field === "paymentDate") ? input.dateRange : null;
  const pFrom = pRange?.from ? new Date(pRange.from) : null;
  let pTo = pRange?.to ? new Date(pRange.to) : null;
  if (pTo) pTo.setDate(pTo.getDate() + 1);

  for (const inv of invoices) {
    if (!inv.payments) continue;
    for (const p of inv.payments) {
      if (p.voided) continue;
      
      const pDate = new Date(p.receivedAt);
      if (pFrom && pDate < pFrom) continue;
      if (pTo && pDate >= pTo) continue;

      const amt = Number(p.amount);
      const dayStr = pDate.toISOString().split("T")[0];
      dayWiseMap.set(dayStr, (dayWiseMap.get(dayStr) || 0) + amt);
      
      methodMap.set(p.paymentMethod, (methodMap.get(p.paymentMethod) || 0) + amt);
    }
  }

  // format Maps to arrays
  const dayWiseCollection = Array.from(dayWiseMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a,b) => a.date.localeCompare(b.date));
  const methodWiseCollection = Array.from(methodMap.entries()).map(([method, amount]) => ({ method, amount }));
  const customerWise = Array.from(customerMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a,b) => b.outstanding - a.outstanding);
  const villageWise = Array.from(villageMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a,b) => b.outstanding - a.outstanding);

  return {
    invoices,
    summary: {
      invoicesCount,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdueAmount,
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      dueTodayCount,
      dueSoonCount,
    },
    dayWiseCollection,
    methodWiseCollection,
    customerWise,
    villageWise,
  };
}
