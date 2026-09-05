import { prisma } from "../../db/prisma";
import type { Prisma } from "@prisma/client";

// First and only writer for the existing `audit_log` table. Deliberately
// fire-and-forget-safe: an audit write must never break the business
// operation it records, so failures are swallowed (logged) rather than
// thrown. Accepts an optional transaction client so an audit row can be
// written inside the same transaction as the change it describes.
export async function writeAudit(
  params: {
    companyId: string;
    userId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    changes?: Prisma.InputJsonValue;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes,
      },
    });
  } catch (err) {
    // Never let an audit failure surface as a business error.
    console.error("[audit] failed to write audit log", { action: params.action, entityId: params.entityId, err });
  }
}
