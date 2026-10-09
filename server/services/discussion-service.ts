import { desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import { recordAuditLog } from "@/server/services/audit-service";
import type { AdminDiscussionTopicUpsertInput } from "@/shared/contracts/monitoring";

export async function listPublicDiscussionTopics() {
  const db = getDb();
  const rows = await db.select().from(schema.discussionTopics).where(eq(schema.discussionTopics.publicStatus, "open")).orderBy(desc(schema.discussionTopics.id));
  return rows.map((r) => ({ id: r.id, title: r.title, startsAt: r.startsAt, endsAt: r.endsAt, moderationPolicy: r.moderationPolicy }));
}

export async function listAdminDiscussionTopics() {
  const db = getDb();
  return db.select().from(schema.discussionTopics).orderBy(desc(schema.discussionTopics.id));
}

export async function upsertDiscussionTopic(input: AdminDiscussionTopicUpsertInput, actorId: number | null, id?: number): Promise<number> {
  const db = getDb();
  const now = nowIso();
  const values = {
    title: input.title,
    linkedMonitoringItemId: input.linkedMonitoringItemId ?? null,
    publicStatus: input.publicStatus,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    moderationPolicy: input.moderationPolicy,
    outcomeContentEntryId: input.outcomeContentEntryId ?? null,
    updatedAt: now,
  };

  if (id) {
    const [existing] = await db.select().from(schema.discussionTopics).where(eq(schema.discussionTopics.id, id)).limit(1);
    if (!existing) throw new NotFoundError("موضوع النقاش غير موجود");
    await db.update(schema.discussionTopics).set(values).where(eq(schema.discussionTopics.id, id));
    await recordAuditLog({ actorUserId: actorId, action: "discussion.update", entityType: "discussion_topics", entityId: id, after: input, requestId: null });
    return id;
  }

  const inserted = await db.insert(schema.discussionTopics).values({ ...values, createdAt: now }).returning({ id: schema.discussionTopics.id });
  await recordAuditLog({ actorUserId: actorId, action: "discussion.create", entityType: "discussion_topics", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
