import { and, desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import { recordAuditLog } from "@/server/services/audit-service";
import type {
  AdminMonitoringIngestionCreateInput,
  AdminMonitoringItemCreateInput,
  AdminMonitoringItemReviewInput,
  AdminMonitoringSourceUpsertInput,
  PublicMonitoringItem,
} from "@/shared/contracts/monitoring";

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function listMonitoringSources() {
  const db = getDb();
  return db.select().from(schema.monitoringSources).orderBy(desc(schema.monitoringSources.id));
}

export async function createMonitoringSource(input: AdminMonitoringSourceUpsertInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const now = nowIso();
  const inserted = await db
    .insert(schema.monitoringSources)
    .values({
      name: input.name,
      sourceType: input.sourceType,
      configSecretRef: input.configSecretRef ?? null,
      topicScope: input.topicScope ?? null,
      language: input.language,
      legalReviewStatus: input.legalReviewStatus,
      // A source can only be marked active if it has already passed legal/terms review —
      // this is the enforcement point for "respect rights and source terms" (brief §15.5).
      active: input.active && input.legalReviewStatus === "approved" ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.monitoringSources.id });
  await recordAuditLog({ actorUserId: actorId, action: "monitoring.create_source", entityType: "monitoring_sources", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

// ---------------------------------------------------------------------------
// Ingestions (always private candidates)
// ---------------------------------------------------------------------------

export async function listMonitoringIngestions(status?: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.monitoringIngestions)
    .where(status ? eq(schema.monitoringIngestions.ingestionStatus, status) : undefined)
    .orderBy(desc(schema.monitoringIngestions.id))
    .limit(100);
}

/** Records a manual/scheduled ingestion as a private candidate. Never visible publicly or to the assistant at this stage. */
export async function createMonitoringIngestion(input: AdminMonitoringIngestionCreateInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const [source] = await db.select().from(schema.monitoringSources).where(eq(schema.monitoringSources.id, input.sourceId)).limit(1);
  if (!source) throw new NotFoundError("مصدر المراقبة غير موجود");

  const now = nowIso();
  const rawMetadataHash = await (async () => {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${input.externalUrl ?? ""}|${input.externalId ?? ""}|${input.headline}`));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  })();

  // Duplicate detection: same source + same raw metadata hash.
  const existingDuplicate = (await db.select().from(schema.monitoringIngestions).where(eq(schema.monitoringIngestions.sourceId, input.sourceId))).find((r) => r.rawMetadataHash === rawMetadataHash);
  if (existingDuplicate) {
    await recordAuditLog({ actorUserId: actorId, action: "monitoring.ingest_duplicate", entityType: "monitoring_ingestions", entityId: existingDuplicate.id, requestId: null });
    return existingDuplicate.id;
  }

  const inserted = await db
    .insert(schema.monitoringIngestions)
    .values({
      sourceId: input.sourceId,
      externalUrl: input.externalUrl ?? null,
      externalId: input.externalId ?? null,
      headline: input.headline,
      permittedExcerpt: input.permittedExcerpt ?? null,
      publicationDate: input.publicationDate ?? null,
      rawMetadataHash,
      ingestionStatus: "candidate",
      createdAt: now,
    })
    .returning({ id: schema.monitoringIngestions.id });

  await recordAuditLog({ actorUserId: actorId, action: "monitoring.ingest", entityType: "monitoring_ingestions", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

// ---------------------------------------------------------------------------
// Items: analyst promotion + reviewer approval
// ---------------------------------------------------------------------------

export async function listMonitoringItems(visibility?: "private" | "public") {
  const db = getDb();
  return db
    .select({ item: schema.monitoringItems, ingestion: schema.monitoringIngestions })
    .from(schema.monitoringItems)
    .innerJoin(schema.monitoringIngestions, eq(schema.monitoringIngestions.id, schema.monitoringItems.ingestionId))
    .where(visibility ? eq(schema.monitoringItems.visibility, visibility) : undefined)
    .orderBy(desc(schema.monitoringItems.id))
    .limit(100);
}

/** Analyst step: promotes an ingestion candidate into a structured, still-private monitoring item. */
export async function createMonitoringItem(input: AdminMonitoringItemCreateInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const [ingestion] = await db.select().from(schema.monitoringIngestions).where(eq(schema.monitoringIngestions.id, input.ingestionId)).limit(1);
  if (!ingestion) throw new NotFoundError("سجل الرصد غير موجود");

  const now = nowIso();
  const inserted = await db
    .insert(schema.monitoringItems)
    .values({
      ingestionId: input.ingestionId,
      itemType: input.itemType,
      relevanceScore: 0,
      sector: input.sector ?? null,
      governorate: input.governorate ?? null,
      verificationState: "unverified",
      analystOwnerId: actorId,
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.monitoringItems.id });

  await db.update(schema.monitoringIngestions).set({ ingestionStatus: "reviewed" }).where(eq(schema.monitoringIngestions.id, input.ingestionId));
  await recordAuditLog({ actorUserId: actorId, action: "monitoring.create_item", entityType: "monitoring_items", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

/** Reviewer step: the only place `visibility` can become `public` — always requires `verificationState=verified`. */
export async function reviewMonitoringItem(itemId: number, input: AdminMonitoringItemReviewInput, actorId: number | null): Promise<void> {
  const db = getDb();
  const [item] = await db.select().from(schema.monitoringItems).where(eq(schema.monitoringItems.id, itemId)).limit(1);
  if (!item) throw new NotFoundError("العنصر غير موجود");

  if (input.visibility === "public" && input.verificationState !== "verified") {
    throw new ConflictError("لا يمكن نشر عنصر رصد قبل التحقق منه");
  }

  const now = nowIso();
  await db
    .update(schema.monitoringItems)
    .set({
      verificationState: input.verificationState,
      relevanceScore: input.relevanceScore ?? item.relevanceScore,
      visibility: input.visibility ?? item.visibility,
      updatedAt: now,
    })
    .where(eq(schema.monitoringItems.id, itemId));

  if (input.linkedType && input.linkedId) {
    await db.insert(schema.monitoringItemLinks).values({ monitoringItemId: itemId, linkedType: input.linkedType, linkedId: input.linkedId, createdAt: now });
  }

  if (input.visibility === "public") {
    await db.update(schema.monitoringIngestions).set({ ingestionStatus: "promoted" }).where(eq(schema.monitoringIngestions.id, item.ingestionId));
  }
  if (input.verificationState === "rejected") {
    await db.update(schema.monitoringIngestions).set({ ingestionStatus: "rejected" }).where(eq(schema.monitoringIngestions.id, item.ingestionId));
  }

  await recordAuditLog({ actorUserId: actorId, action: "monitoring.review_item", entityType: "monitoring_items", entityId: itemId, before: { verificationState: item.verificationState, visibility: item.visibility }, after: input, requestId: null });
}

/** Public read: only verified + public items, always carrying source/date/verification metadata. */
export async function listPublicMonitoringItems(): Promise<PublicMonitoringItem[]> {
  const db = getDb();
  const rows = await db
    .select({ item: schema.monitoringItems, ingestion: schema.monitoringIngestions, source: schema.monitoringSources })
    .from(schema.monitoringItems)
    .innerJoin(schema.monitoringIngestions, eq(schema.monitoringIngestions.id, schema.monitoringItems.ingestionId))
    .innerJoin(schema.monitoringSources, eq(schema.monitoringSources.id, schema.monitoringIngestions.sourceId))
    .where(and(eq(schema.monitoringItems.visibility, "public"), eq(schema.monitoringItems.verificationState, "verified")))
    .orderBy(desc(schema.monitoringItems.id))
    .limit(50);

  const items: PublicMonitoringItem[] = [];
  for (const row of rows) {
    const links = await db.select().from(schema.monitoringItemLinks).where(eq(schema.monitoringItemLinks.monitoringItemId, row.item.id));
    items.push({
      id: row.item.id,
      itemType: row.item.itemType as PublicMonitoringItem["itemType"],
      headline: row.ingestion.headline,
      excerpt: row.ingestion.permittedExcerpt,
      sourceName: row.source.name,
      publicationDate: row.ingestion.publicationDate,
      verificationState: "verified",
      sector: row.item.sector,
      governorate: row.item.governorate,
      links: links.map((l) => ({ linkedType: l.linkedType, linkedId: l.linkedId })),
    });
  }
  return items;
}
