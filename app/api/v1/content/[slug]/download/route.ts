import { eq } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse, NotFoundError } from "@/server/http/errors";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { localeSchema } from "@/shared/contracts/common";
import { publicAssetUrl } from "@/server/storage/r2-storage";
import { recordAuditLog } from "@/server/services/audit-service";

/**
 * POST /api/v1/content/:slug/download — records a download event for a published content
 * entry's attached public document before returning its delivery URL. Staff-only documents
 * (`download_visibility=staff`) are rejected here; use the admin media endpoints instead.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const db = getDb();

    const [entry] = await db
      .select()
      .from(schema.contentEntries)
      .where(eq(schema.contentEntries.canonicalSlug, slug))
      .limit(1);
    if (!entry || entry.status !== "published" || entry.locale !== locale) throw new NotFoundError("المحتوى غير متاح");

    const [media] = await db.select().from(schema.contentMedia).where(eq(schema.contentMedia.entryId, entry.id)).limit(1);
    if (!media) throw new NotFoundError("لا يوجد ملف مرفق لهذا المحتوى");

    const [documentAsset] = await db.select().from(schema.documentAssets).where(eq(schema.documentAssets.storageAssetId, media.assetId)).limit(1);
    if (documentAsset && documentAsset.downloadVisibility === "staff") throw new NotFoundError("هذا الملف غير متاح للتنزيل العام");

    const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, media.assetId)).limit(1);
    if (!asset) throw new NotFoundError("الملف غير متاح");

    await db.insert(schema.analyticsEvents).values({
      eventName: "content.download",
      contentEntryId: entry.id,
      pagePath: `/content/${entry.canonicalSlug}`,
      metadataJson: "{}",
      createdAt: nowIso(),
    });
    await recordAuditLog({ actorUserId: null, action: "content.download", entityType: "content_entries", entityId: entry.id, requestId: null });

    return jsonOk({ url: publicAssetUrl(asset.objectKey) }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
