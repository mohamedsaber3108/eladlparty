import { and, desc, eq, like, lt, lte, or, sql } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/server/http/errors";
import type { AdminContentCreateInput, AdminContentPublishAction, AdminContentUpdateInput } from "@/shared/contracts/admin";
import type { ContentCard, ContentDetail, ContentListQuery } from "@/shared/contracts/content";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";

type ContentEntryRow = typeof schema.contentEntries.$inferSelect;

const typePaths: Record<string, (slug: string) => string> = {
  news: (s) => `/news/${s}`,
  program: (s) => `/programs/${s}`,
  initiative: (s) => `/initiatives/${s}`,
  opportunity: (s) => `/opportunities/${s}`,
  success_story: (s) => `/success-stories/${s}`,
  report: (s) => `/insights/reports/${s}`,
  research: (s) => `/insights/research/${s}`,
  publication: (s) => `/insights/publications/${s}`,
  resource: (s) => `/resources/${s}`,
  policy_paper: (s) => `/observatory/policies/${s}`,
  solution: (s) => `/observatory/solutions/${s}`,
  call: (s) => `/calls/${s}`,
  announcement: (s) => `/news/${s}`,
  page: (s) => `/${s}`,
  faq: () => `/faq`,
};

function hrefFor(entry: Pick<ContentEntryRow, "contentType" | "canonicalSlug">): string {
  return (typePaths[entry.contentType] ?? ((s: string) => `/${entry.contentType}/${s}`))(entry.canonicalSlug);
}

async function tagsForEntry(entryId: number): Promise<{ categories: string[]; tags: string[] }> {
  const db = getDb();
  const rows = await db
    .select({ kind: schema.taxonomyTerms.kind, label: schema.taxonomyTerms.label })
    .from(schema.contentTaxonomyTerms)
    .innerJoin(schema.taxonomyTerms, eq(schema.taxonomyTerms.id, schema.contentTaxonomyTerms.termId))
    .where(eq(schema.contentTaxonomyTerms.entryId, entryId));
  return {
    categories: rows.filter((r) => r.kind === "category").map((r) => r.label),
    tags: rows.filter((r) => r.kind === "tag").map((r) => r.label),
  };
}

async function coverUrl(coverAssetId: number | null): Promise<string | null> {
  if (!coverAssetId) return null;
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, coverAssetId)).limit(1);
  return asset ? `/media/${asset.objectKey}` : null;
}

async function toCard(entry: ContentEntryRow): Promise<ContentCard> {
  const [{ categories, tags }, coverImageUrl] = await Promise.all([tagsForEntry(entry.id), coverUrl(entry.coverAssetId)]);
  return {
    id: entry.id,
    contentType: entry.contentType as ContentCard["contentType"],
    slug: entry.canonicalSlug,
    locale: entry.locale as ContentCard["locale"],
    title: entry.title,
    excerpt: entry.excerpt,
    coverImageUrl,
    featured: entry.featured === 1,
    publishedAt: entry.publishedAt,
    categories,
    tags,
    href: hrefFor(entry),
  };
}

function encodeCursor(entry: ContentEntryRow): string {
  return btoa(`${entry.publishedAt ?? entry.createdAt}|${entry.id}`);
}

function decodeCursor(cursor: string): { publishedAt: string; id: number } | null {
  try {
    const [publishedAt, idRaw] = atob(cursor).split("|");
    const id = Number(idRaw);
    if (!publishedAt || Number.isNaN(id)) return null;
    return { publishedAt, id };
  } catch {
    return null;
  }
}

/** Public listing: only `published` records, filtered by type/locale/category/tag/q, cursor-paginated. */
export async function listPublicContent(query: ContentListQuery): Promise<{ items: ContentCard[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = query.limit;
  const conditions = [eq(schema.contentEntries.status, "published"), eq(schema.contentEntries.locale, query.locale)];
  if (query.type) conditions.push(eq(schema.contentEntries.contentType, query.type));
  if (query.slug) conditions.push(eq(schema.contentEntries.canonicalSlug, query.slug));
  if (typeof query.featured === "boolean") conditions.push(eq(schema.contentEntries.featured, query.featured ? 1 : 0));
  if (query.q) {
    const needle = `%${query.q}%`;
    conditions.push(
      or(like(schema.contentEntries.title, needle), like(schema.contentEntries.excerpt, needle), like(schema.contentEntries.bodyRichtext, needle))!
    );
  }

  const cursorValue = query.cursor ? decodeCursor(query.cursor) : null;
  if (cursorValue) {
    conditions.push(
      or(
        lt(schema.contentEntries.publishedAt, cursorValue.publishedAt),
        and(eq(schema.contentEntries.publishedAt, cursorValue.publishedAt), lt(schema.contentEntries.id, cursorValue.id))
      )!
    );
  }

  let rows = await db
    .select()
    .from(schema.contentEntries)
    .where(and(...conditions))
    .orderBy(desc(schema.contentEntries.featured), desc(schema.contentEntries.publishedAt), desc(schema.contentEntries.id))
    .limit(limit + 1);

  // category/tag filters require the join table; applied in-memory after the primary query
  // (acceptable at current content volume — revisit with a join-based filter if it grows).
  if (query.category || query.tag) {
    const filtered: ContentEntryRow[] = [];
    for (const row of rows) {
      const { categories, tags } = await tagsForEntry(row.id);
      if (query.category && !categories.includes(query.category)) continue;
      if (query.tag && !tags.includes(query.tag)) continue;
      filtered.push(row);
    }
    rows = filtered;
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = await Promise.all(pageRows.map(toCard));
  const nextCursor = hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null;
  return { items, nextCursor };
}

/** Public detail by slug+locale. Throws NotFoundError if missing or not published. */
export async function getPublicContentBySlug(slug: string, locale: "ar" | "en"): Promise<ContentDetail> {
  const db = getDb();
  const [entry] = await db
    .select()
    .from(schema.contentEntries)
    .where(
      and(
        eq(schema.contentEntries.canonicalSlug, slug),
        eq(schema.contentEntries.locale, locale),
        eq(schema.contentEntries.status, "published")
      )
    )
    .limit(1);
  if (!entry) throw new NotFoundError("المحتوى غير متاح أو لم يُنشر بعد");

  const card = await toCard(entry);
  const relatedRows = await db
    .select({ target: schema.contentEntries })
    .from(schema.relatedContent)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.relatedContent.targetEntryId))
    .where(and(eq(schema.relatedContent.sourceEntryId, entry.id), eq(schema.contentEntries.status, "published")))
    .orderBy(schema.relatedContent.sortOrder)
    .limit(6);
  const related = await Promise.all(relatedRows.map((r) => toCard(r.target)));

  return {
    ...card,
    body: entry.bodyRichtext,
    seoTitle: entry.seoTitle,
    seoDescription: entry.seoDescription,
    related,
    breadcrumbs: [{ label: card.contentType, href: `/${card.contentType}` }, { label: card.title, href: card.href }],
  };
}

async function assertSlugAvailable(slug: string, locale: string, excludeId?: number): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.contentEntries.id })
    .from(schema.contentEntries)
    .where(and(eq(schema.contentEntries.canonicalSlug, slug), eq(schema.contentEntries.locale, locale)));
  if (rows.some((r) => r.id !== excludeId)) throw new ConflictError("هذا الـslug مستخدم في هذه اللغة من قبل");
}

async function syncTaxonomy(entryId: number, locale: string, category: string | undefined, tags: string[] | undefined): Promise<void> {
  const db = getDb();
  const now = nowIso();
  await db.delete(schema.contentTaxonomyTerms).where(eq(schema.contentTaxonomyTerms.entryId, entryId));

  async function upsertTerm(kind: "category" | "tag", label: string): Promise<number> {
    const slug = label.trim().toLowerCase().replace(/\s+/g, "-");
    const [existing] = await db
      .select()
      .from(schema.taxonomyTerms)
      .where(and(eq(schema.taxonomyTerms.kind, kind), eq(schema.taxonomyTerms.slug, slug), eq(schema.taxonomyTerms.locale, locale)))
      .limit(1);
    if (existing) return existing.id;
    const inserted = await db
      .insert(schema.taxonomyTerms)
      .values({ kind, locale, label, slug, createdAt: now })
      .returning({ id: schema.taxonomyTerms.id });
    return inserted[0].id;
  }

  const labels: { kind: "category" | "tag"; label: string }[] = [];
  if (category) labels.push({ kind: "category", label: category });
  for (const tag of tags ?? []) labels.push({ kind: "tag", label: tag });

  for (const { kind, label } of labels) {
    const termId = await upsertTerm(kind, label);
    await db.insert(schema.contentTaxonomyTerms).values({ entryId, termId }).onConflictDoNothing();
  }
}

/** Creates a draft (or directly-published, if explicitly requested) content entry. Returns the new row id. */
export async function createContentEntry(input: AdminContentCreateInput, authorId: number | null): Promise<number> {
  await assertSlugAvailable(input.canonicalSlug, input.locale);
  const db = getDb();
  const now = nowIso();
  const status = input.status ?? "draft";
  const publishedAt = status === "published" ? now : null;

  const inserted = await db
    .insert(schema.contentEntries)
    .values({
      contentType: input.contentType,
      canonicalSlug: input.canonicalSlug,
      locale: input.locale,
      title: input.title,
      excerpt: input.excerpt,
      bodyRichtext: input.bodyRichtext,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      status,
      publishedAt,
      featured: input.featured ? 1 : 0,
      coverAssetId: input.coverAssetId ?? null,
      authorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.contentEntries.id });

  const id = inserted[0].id;
  await syncTaxonomy(id, input.locale, input.category, input.tags);
  await db.insert(schema.contentRevisions).values({
    entryId: id,
    revisionNumber: 1,
    snapshotJson: JSON.stringify(input),
    changeNote: "initial draft",
    authorId,
    createdAt: now,
  });
  if (status === "published") await enqueueOutboxJob("search_index", { entityType: "content_entries", entityId: id });
  await recordAuditLog({ actorUserId: authorId, action: "content.create", entityType: "content_entries", entityId: id, after: input, requestId: null });
  return id;
}

/** Updates fields on a content entry and writes a new revision snapshot. */
export async function updateContentEntry(input: AdminContentUpdateInput, actorId: number | null): Promise<void> {
  const db = getDb();
  const [existing] = await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.id, input.id)).limit(1);
  if (!existing) throw new NotFoundError("المحتوى غير موجود");

  if (input.canonicalSlug && input.canonicalSlug !== existing.canonicalSlug) {
    await assertSlugAvailable(input.canonicalSlug, input.locale ?? existing.locale, existing.id);
  }

  const now = nowIso();
  const next: Partial<ContentEntryRow> = { updatedAt: now };
  if (input.title !== undefined) next.title = input.title;
  if (input.excerpt !== undefined) next.excerpt = input.excerpt;
  if (input.bodyRichtext !== undefined) next.bodyRichtext = input.bodyRichtext;
  if (input.seoTitle !== undefined) next.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) next.seoDescription = input.seoDescription;
  if (input.canonicalSlug !== undefined) next.canonicalSlug = input.canonicalSlug;
  if (input.locale !== undefined) next.locale = input.locale;
  if (input.coverAssetId !== undefined) next.coverAssetId = input.coverAssetId;
  if (input.featured !== undefined) next.featured = input.featured ? 1 : 0;

  await db.update(schema.contentEntries).set(next).where(eq(schema.contentEntries.id, input.id));
  if (input.category !== undefined || input.tags !== undefined) {
    await syncTaxonomy(input.id, input.locale ?? existing.locale, input.category, input.tags);
  }

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.contentRevisions.revisionNumber}), 0)` })
    .from(schema.contentRevisions)
    .where(eq(schema.contentRevisions.entryId, input.id));
  await db.insert(schema.contentRevisions).values({
    entryId: input.id,
    revisionNumber: max + 1,
    snapshotJson: JSON.stringify(input),
    changeNote: input.changeNote ?? null,
    authorId: actorId,
    createdAt: now,
  });

  if (existing.status === "published") await enqueueOutboxJob("search_index", { entityType: "content_entries", entityId: input.id });
  await recordAuditLog({ actorUserId: actorId, action: "content.update", entityType: "content_entries", entityId: input.id, before: existing, after: input, requestId: null });
}

const validTransitions: Record<string, string[]> = {
  draft: ["submit_review", "publish", "archive"],
  review: ["approve", "request_changes", "publish", "archive"],
  changes_requested: ["submit_review", "archive"],
  approved: ["publish", "schedule", "archive"],
  scheduled: ["publish", "archive"],
  published: ["unpublish", "archive"],
  archived: [],
};

const actionToStatus: Record<AdminContentPublishAction["action"], string> = {
  submit_review: "review",
  approve: "approved",
  request_changes: "changes_requested",
  publish: "published",
  unpublish: "draft",
  schedule: "scheduled",
  archive: "archived",
};

/** Validates required fields and runs the content lifecycle state transition. */
export async function transitionContentEntry(input: AdminContentPublishAction, actorId: number | null): Promise<void> {
  const db = getDb();
  const [entry] = await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.id, input.id)).limit(1);
  if (!entry) throw new NotFoundError("المحتوى غير موجود");

  if (!validTransitions[entry.status]?.includes(input.action)) {
    throw new ConflictError(`لا يمكن تنفيذ "${input.action}" من حالة "${entry.status}"`);
  }

  if (input.action === "publish" || input.action === "schedule") {
    const fieldErrors: Record<string, string[]> = {};
    if (!entry.title) fieldErrors.title = ["العنوان مطلوب قبل النشر"];
    if (!entry.excerpt) fieldErrors.excerpt = ["الملخص مطلوب قبل النشر"];
    if (!entry.bodyRichtext) fieldErrors.bodyRichtext = ["المحتوى مطلوب قبل النشر"];
    if (Object.keys(fieldErrors).length) throw new ValidationError(fieldErrors, "لا يمكن النشر بدون الحقول الأساسية");
  }

  const now = nowIso();
  const nextStatus = actionToStatus[input.action];
  const patch: Partial<ContentEntryRow> = { status: nextStatus, updatedAt: now };
  if (input.action === "publish") patch.publishedAt = now;
  if (input.action === "schedule") patch.scheduledAt = input.scheduledAt ?? null;
  if (input.action === "approve" || input.action === "request_changes") patch.reviewerId = actorId;

  await db.update(schema.contentEntries).set(patch).where(eq(schema.contentEntries.id, input.id));

  if (input.action === "publish" || input.action === "unpublish" || input.action === "archive") {
    await enqueueOutboxJob("search_index", { entityType: "content_entries", entityId: input.id, operation: input.action === "publish" ? "upsert" : "delete" });
  }

  await recordAuditLog({
    actorUserId: actorId,
    action: `content.${input.action}`,
    entityType: "content_entries",
    entityId: input.id,
    before: { status: entry.status },
    after: { status: nextStatus, note: input.note },
    requestId: null,
  });
}

/** Archive-first delete: published content is archived rather than removed; drafts can be hard-deleted. */
export async function deleteContentEntry(id: number, actorId: number | null): Promise<void> {
  const db = getDb();
  const [entry] = await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.id, id)).limit(1);
  if (!entry) throw new NotFoundError("المحتوى غير موجود");

  if (entry.status === "published") {
    await db.update(schema.contentEntries).set({ status: "archived", updatedAt: nowIso() }).where(eq(schema.contentEntries.id, id));
    await enqueueOutboxJob("search_index", { entityType: "content_entries", entityId: id, operation: "delete" });
  } else {
    await db.delete(schema.contentEntries).where(eq(schema.contentEntries.id, id));
  }
  await recordAuditLog({ actorUserId: actorId, action: "content.delete", entityType: "content_entries", entityId: id, before: entry, requestId: null });
}

/** Admin listing (any status, any locale) with simple cursor-by-id pagination. */
export async function listAdminContent(filters: { type?: string; status?: string; locale?: string; cursor?: string; limit: number }) {
  const db = getDb();
  const conditions = [];
  if (filters.type) conditions.push(eq(schema.contentEntries.contentType, filters.type));
  if (filters.status) conditions.push(eq(schema.contentEntries.status, filters.status));
  if (filters.locale) conditions.push(eq(schema.contentEntries.locale, filters.locale));
  if (filters.cursor) conditions.push(lt(schema.contentEntries.id, Number(filters.cursor)));

  const rows = await db
    .select()
    .from(schema.contentEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.contentEntries.id))
    .limit(filters.limit + 1);

  const hasMore = rows.length > filters.limit;
  const page = hasMore ? rows.slice(0, filters.limit) : rows;
  return { items: page, nextCursor: hasMore ? String(page[page.length - 1].id) : null };
}

export async function getContentEntryById(id: number) {
  const db = getDb();
  const [entry] = await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.id, id)).limit(1);
  if (!entry) throw new NotFoundError("المحتوى غير موجود");
  return entry;
}

export async function listContentRevisions(entryId: number) {
  const db = getDb();
  return db.select().from(schema.contentRevisions).where(eq(schema.contentRevisions.entryId, entryId)).orderBy(desc(schema.contentRevisions.revisionNumber));
}

/** Scheduled-publish sweep: promotes `scheduled` entries whose time has arrived. Called by the cron/outbox worker. */
export async function runScheduledPublishSweep(): Promise<number> {
  const db = getDb();
  const now = nowIso();
  const due = await db
    .select()
    .from(schema.contentEntries)
    .where(and(eq(schema.contentEntries.status, "scheduled"), lte(schema.contentEntries.scheduledAt, now)));
  for (const entry of due) {
    await db.update(schema.contentEntries).set({ status: "published", publishedAt: now, updatedAt: now }).where(eq(schema.contentEntries.id, entry.id));
    await enqueueOutboxJob("search_index", { entityType: "content_entries", entityId: entry.id });
  }
  return due.length;
}
