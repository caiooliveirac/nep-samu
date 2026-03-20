import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

interface AuditEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry) {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValue: entry.oldValue as Record<string, unknown>,
    newValue: entry.newValue as Record<string, unknown>,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });
}
