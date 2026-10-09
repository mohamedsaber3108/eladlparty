import { desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import { recordAuditLog } from "@/server/services/audit-service";
import { enqueueOutboxJob } from "@/server/jobs/outbox";

export async function listKnowledgeEntries() {
  const db = getDb();
  return db.select().from(schema.knowledgeEntries).orderBy(desc(schema.knowledgeEntries.id));
}

export async function createKnowledgeEntry(question: string, answer: string, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const inserted = await db.insert(schema.knowledgeEntries).values({ question, answer, status: "draft", updatedAt: now }).returning({ id: schema.knowledgeEntries.id });
  await recordAuditLog({ actorUserId: actorId, action: "knowledge.create", entityType: "knowledge_entries", entityId: inserted[0].id, after: { question, answer }, requestId: null });
  return inserted[0].id;
}

/** Approves a knowledge entry for assistant retrieval and queues knowledge ingestion. */
export async function approveKnowledgeEntry(id: number, actorId: number | null) {
  const db = getDb();
  const [entry] = await db.select().from(schema.knowledgeEntries).where(eq(schema.knowledgeEntries.id, id)).limit(1);
  if (!entry) throw new NotFoundError("لم يتم العثور على سجل المعرفة");
  await db.update(schema.knowledgeEntries).set({ status: "published", updatedAt: nowIso() }).where(eq(schema.knowledgeEntries.id, id));

  const now = nowIso();
  const sourceInserted = await db
    .insert(schema.assistantKnowledgeSources)
    .values({ sourceType: "faq", entryId: null, locale: "ar", approved: 1, ingestionStatus: "pending", createdAt: now, updatedAt: now })
    .returning({ id: schema.assistantKnowledgeSources.id });
  await enqueueOutboxJob("knowledge_ingest", { sourceId: sourceInserted[0].id });

  await recordAuditLog({ actorUserId: actorId, action: "knowledge.approve", entityType: "knowledge_entries", entityId: id, requestId: null });
}

export async function archiveKnowledgeEntry(id: number, actorId: number | null) {
  const db = getDb();
  const [entry] = await db.select().from(schema.knowledgeEntries).where(eq(schema.knowledgeEntries.id, id)).limit(1);
  if (!entry) throw new NotFoundError("لم يتم العثور على سجل المعرفة");
  await db.update(schema.knowledgeEntries).set({ status: "archived", updatedAt: nowIso() }).where(eq(schema.knowledgeEntries.id, id));
  await recordAuditLog({ actorUserId: actorId, action: "knowledge.archive", entityType: "knowledge_entries", entityId: id, requestId: null });
}
