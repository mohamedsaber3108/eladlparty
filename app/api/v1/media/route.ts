import { and, desc, eq, like, lt, or } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseQuery } from "@/server/http/validate";
import { mediaListQuerySchema } from "@/shared/contracts/media";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";

/**
 * GET /api/v1/media — published/ready storage assets only, with signed/transformed public URLs.
 * Backed by `storage_assets` (the new R2-aware table). Legacy `media_assets` rows (flat URLs,
 * no R2 key) remain served from `/api/media` via the compatibility adapter during migration.
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const query = parseQuery(url, mediaListQuerySchema);
    const db = getDb();
    const conditions = [eq(schema.storageAssets.processingStatus, "ready")];
    if (query.kind === "image") conditions.push(like(schema.storageAssets.mimeType, "image/%"));
    if (query.kind === "video") conditions.push(like(schema.storageAssets.mimeType, "video/%"));
    if (query.kind === "document") conditions.push(like(schema.storageAssets.mimeType, "application/%"));
    if (query.q) {
      const needle = `%${query.q}%`;
      conditions.push(or(like(schema.storageAssets.caption, needle), like(schema.storageAssets.altText, needle))!);
    }
    if (query.cursor) conditions.push(lt(schema.storageAssets.id, Number(query.cursor)));

    const rows = await db
      .select()
      .from(schema.storageAssets)
      .where(and(...conditions))
      .orderBy(desc(schema.storageAssets.id))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const items = page.map((asset) => ({
      id: asset.id,
      kind: asset.mimeType.startsWith("image/") ? "image" : asset.mimeType.startsWith("video/") ? "video" : "document",
      title: asset.caption ?? "",
      url: `/media/${asset.objectKey}`,
      alt: asset.altText,
      createdAt: asset.createdAt,
    }));
    return jsonOk(items, requestId, { meta: { nextCursor: hasMore ? String(page[page.length - 1].id) : null, limit: query.limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
