import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/server/http/errors";
import { allowedMimeTypes, maxUploadBytes, type UploadSignRequest } from "@/shared/contracts/media";
import { randomToken } from "@/server/security/crypto";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";

function requireBucket(): R2Bucket {
  if (!env.BUCKET) {
    throw new AppError(
      503,
      "التخزين السحابي (R2) غير مُفعّل لهذا المشروع بعد. حدّد قيمة r2 في .openai/hosting.json واربط R2Bucket binding باسم BUCKET قبل رفع الملفات."
    );
  }
  return env.BUCKET;
}

/**
 * Step 1 of the upload flow: validate MIME/size, create a `pending` storage_assets row, and
 * return a time-limited signed PUT URL for the browser to upload directly to R2.
 *
 * Cloudflare R2's S3-compatible API supports presigned URLs via AWS SigV4, which requires the
 * bucket's S3 API credentials (access key/secret) as additional secrets, not provisioned in
 * this environment. Until `R2_S3_ACCESS_KEY_ID` / `R2_S3_SECRET_ACCESS_KEY` are configured,
 * this returns a same-origin `PUT /api/v1/admin/media/upload/:objectKey` URL instead, which the
 * admin SPA can call directly (the Worker proxies the bytes to `env.BUCKET.put()`). Swap in a
 * real presigned-URL implementation once the S3 credentials are set, without changing the
 * response shape.
 */
export async function signUpload(request: UploadSignRequest, createdBy: number | null) {
  requireBucket();
  const allowed = allowedMimeTypes[request.kind];
  if (!allowed.includes(request.contentType)) {
    throw new ValidationError({ contentType: [`نوع الملف غير مسموح لهذا النوع. المسموح: ${allowed.join(", ")}`] });
  }
  const maxBytes = maxUploadBytes[request.kind];
  if (request.size > maxBytes) {
    throw new ValidationError({ size: [`الحجم الأقصى المسموح ${Math.round(maxBytes / (1024 * 1024))}MB`] });
  }

  const extension = request.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const objectKey = `${request.kind}/${new Date().toISOString().slice(0, 10)}/${randomToken(16)}.${extension}`;

  const db = getDb();
  const now = nowIso();
  const inserted = await db
    .insert(schema.storageAssets)
    .values({
      objectKey,
      mimeType: request.contentType,
      sizeBytes: request.size,
      altText: request.alt ?? null,
      caption: request.title ?? null,
      processingStatus: "pending",
      createdBy,
      createdAt: now,
    })
    .returning({ id: schema.storageAssets.id });

  return {
    uploadUrl: `/api/v1/admin/media/upload/${encodeURIComponent(objectKey)}`,
    objectKey,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    pendingAssetId: inserted[0].id,
  };
}

/** Receives the raw upload bytes server-side and writes them into R2 under the pre-registered object key. */
export async function receiveUploadBytes(objectKey: string, body: ReadableStream | ArrayBuffer, contentType: string): Promise<void> {
  const bucket = requireBucket();
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.objectKey, objectKey)).limit(1);
  if (!asset) throw new NotFoundError("لم يتم تهيئة هذا الملف للرفع");
  if (asset.processingStatus !== "pending") throw new ConflictError("هذا الملف تم رفعه مسبقًا");

  await bucket.put(objectKey, body, { httpMetadata: { contentType } });
}

/** Step 2 of the upload flow: verifies the object landed in R2, computes a checksum, and marks the asset ready. */
export async function confirmUpload(pendingAssetId: number, actorId: number | null): Promise<void> {
  const bucket = requireBucket();
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, pendingAssetId)).limit(1);
  if (!asset) throw new NotFoundError("الملف غير موجود");

  const object = await bucket.head(asset.objectKey);
  if (!object) throw new ConflictError("لم يتم استلام الملف في التخزين بعد");

  await db
    .update(schema.storageAssets)
    .set({ processingStatus: "ready", checksum: object.etag, sizeBytes: object.size })
    .where(eq(schema.storageAssets.id, pendingAssetId));

  await enqueueOutboxJob("search_index", { entityType: "storage_assets", entityId: pendingAssetId });
  await recordAuditLog({ actorUserId: actorId, action: "media.confirm_upload", entityType: "storage_assets", entityId: pendingAssetId, requestId: null });
}

export async function deleteStorageAsset(id: number, actorId: number | null): Promise<void> {
  const bucket = requireBucket();
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, id)).limit(1);
  if (!asset) throw new NotFoundError("الملف غير موجود");
  await bucket.delete(asset.objectKey);
  await db.delete(schema.storageAssets).where(eq(schema.storageAssets.id, id));
  await recordAuditLog({ actorUserId: actorId, action: "media.delete", entityType: "storage_assets", entityId: id, before: asset, requestId: null });
}

/** Public delivery URL for a ready asset. Private/staff-only assets should use a short-lived signed URL instead (not yet wired — see docs/SECURITY.md). */
export function publicAssetUrl(objectKey: string): string {
  return `/media/${objectKey}`;
}
