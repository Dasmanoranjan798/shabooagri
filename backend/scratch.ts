import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { invoiceIncludeRelations } from "./invoice.repository";

export async function filterInvoicesWithAnalytics(companyId: string, input: any) {
  // build where clause
  let where: Prisma.InvoiceWhereInput = { companyId };
  // ...
}
