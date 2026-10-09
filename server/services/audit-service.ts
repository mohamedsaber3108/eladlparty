import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { hashForAudit } from "@/server/security/crypto";

export interface AuditLogInput {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | number | null;
  before?: unknown;
  after?: unknown;
  requestId: string | null;
  ip?: string | null;
}

/** Persists a durable audit record. Every admin mutation must call this. */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  const db = getDb();
  await db.insert(schema.auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === undefined ? null : JSON.stringify(input.after),
    requestId: input.requestId,
    ipHash: await hashForAudit(input.ip),
    createdAt: nowIso(),
  });
}
