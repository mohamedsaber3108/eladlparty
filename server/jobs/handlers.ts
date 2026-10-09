import { eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { getEmailAdapter } from "@/server/notifications/email-adapter";
import type { OutboxHandlers } from "@/server/jobs/outbox";

/**
 * Search indexing currently has no dedicated index store (no Vectorize/external search
 * service is provisioned). Published-content search already queries `content_entries`
 * directly (see server/services/search-service.ts), so this handler's job is limited to
 * recording that re-indexing happened via `search_index_queue`, which doubles as an audit
 * trail and the extension point for a future dedicated FTS/vector index.
 */
async function handleSearchIndex(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  await db.insert(schema.searchIndexQueue).values({
    entityType: String(payload.entityType ?? "unknown"),
    entityId: Number(payload.entityId ?? 0),
    locale: String(payload.locale ?? "ar"),
    operation: String(payload.operation ?? "upsert"),
    status: "done",
    createdAt: nowIso(),
    processedAt: nowIso(),
  });
}

async function handleNotification(payload: Record<string, unknown>): Promise<void> {
  const to = String(payload.to ?? "");
  if (!to) throw new Error("notification payload missing `to`");
  const result = await getEmailAdapter().send({
    to,
    subject: String(payload.subject ?? "إشعار من بوابة أمانة ريادة الأعمال"),
    text: String(payload.text ?? ""),
  });
  if (!result.ok) throw new Error(result.error ?? "email_send_failed");
}

/**
 * Knowledge ingestion marks the referenced content/document as approved+ingested so the
 * assistant's retrieval step (server/services/assistant-service.ts) can surface it. No vector
 * embedding provider is configured in this environment, so retrieval is keyword/LIKE-based
 * against `assistant_knowledge_sources`/`knowledge_entries` rather than semantic search.
 */
async function handleKnowledgeIngest(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const sourceId = Number(payload.sourceId ?? 0);
  if (!sourceId) throw new Error("knowledge_ingest payload missing sourceId");
  await db
    .update(schema.assistantKnowledgeSources)
    .set({ ingestionStatus: "ingested", updatedAt: nowIso() })
    .where(eq(schema.assistantKnowledgeSources.id, sourceId));
}

export const outboxHandlers: OutboxHandlers = {
  notification: handleNotification,
  search_index: handleSearchIndex,
  knowledge_ingest: handleKnowledgeIngest,
};
