import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";

export type OutboxJobType = "notification" | "search_index" | "knowledge_ingest";

/**
 * D1-backed job outbox. This project does not have a Cloudflare Queues binding provisioned
 * (see .openai/hosting.json — only `d1` is set, `r2` is null, no `queues` key exists), so
 * background work (notifications, search re-indexing, assistant knowledge ingestion) is
 * durably recorded here and drained by `drainOutbox()`, which should be invoked from a
 * Cron Trigger (`wrangler.toml` `[triggers] crons`) once that's configured for this project,
 * or manually via `POST /api/v1/admin/jobs/drain` in the interim.
 */
export async function enqueueOutboxJob(jobType: OutboxJobType, payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const now = nowIso();
  await db.insert(schema.outboxJobs).values({
    jobType,
    payloadJson: JSON.stringify(payload),
    status: "pending",
    availableAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export interface OutboxHandlers {
  notification: (payload: Record<string, unknown>) => Promise<void>;
  search_index: (payload: Record<string, unknown>) => Promise<void>;
  knowledge_ingest: (payload: Record<string, unknown>) => Promise<void>;
}

/** Drains up to `batchSize` due jobs, invoking the matching handler and recording success/failure. */
export async function drainOutbox(handlers: OutboxHandlers, batchSize = 20): Promise<{ processed: number; failed: number }> {
  const db = getDb();
  const now = nowIso();
  const due = await db
    .select()
    .from(schema.outboxJobs)
    .where(and(eq(schema.outboxJobs.status, "pending"), lte(schema.outboxJobs.availableAt, now)))
    .orderBy(asc(schema.outboxJobs.id))
    .limit(batchSize);

  let processed = 0;
  let failed = 0;
  for (const job of due) {
    await db.update(schema.outboxJobs).set({ status: "processing", updatedAt: nowIso() }).where(eq(schema.outboxJobs.id, job.id));
    try {
      const payload = JSON.parse(job.payloadJson) as Record<string, unknown>;
      await handlers[job.jobType as OutboxJobType](payload);
      await db.update(schema.outboxJobs).set({ status: "done", updatedAt: nowIso() }).where(eq(schema.outboxJobs.id, job.id));
      processed += 1;
    } catch (error) {
      failed += 1;
      const nextAttempts = job.attempts + 1;
      const backoffMs = Math.min(60_000 * nextAttempts, 15 * 60_000);
      await db
        .update(schema.outboxJobs)
        .set({
          status: nextAttempts >= 5 ? "failed" : "pending",
          attempts: nextAttempts,
          lastError: error instanceof Error ? error.message : String(error),
          availableAt: new Date(Date.now() + backoffMs).toISOString(),
          updatedAt: nowIso(),
        })
        .where(eq(schema.outboxJobs.id, job.id));
    }
  }
  return { processed, failed };
}

export async function countFailedOutboxJobs(): Promise<number> {
  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.outboxJobs)
    .where(eq(schema.outboxJobs.status, "failed"));
  return count;
}
