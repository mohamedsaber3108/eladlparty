import { eq } from "drizzle-orm";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/server/http/errors";
import { allowedMimeTypes, maxUploadBytes, type UploadSignRequest } from "@/shared/contracts/media";
import { randomToken } from "@/server/security/crypto";
import { enqueueJob } from "@/server/jobs/queue";
import { recordAuditLog } from "@/server/services/audit-service";

/**
 * S3 client configured against real AWS S3 (production) or a local S3-compatible endpoint
 * such as MinIO (development, via AWS_S3_ENDPOINT). On EC2, prefer attaching an IAM instance
 * role with least-privilege S3 permissions scoped to this bucket over static access keys —
 * the SDK's default credential provider chain picks up the instance role automatically when
 * AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are left unset.
 */
let s3: S3Client | undefined;

function getBucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new AppError(503, "تخزين الوسائط (S3) غير مُفعّل لهذا المشروع بعد. حدّد متغيرات AWS_S3_* البيئية قبل رفع الملفات.");
  }
  return bucket;
}

function getS3Client(): S3Client {
  if (!s3) {
    const region = process.env.AWS_REGION ?? "us-east-1";
    const endpoint = process.env.AWS_S3_ENDPOINT; // only set for local dev (MinIO); unset in production (real AWS S3)
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    s3 = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      // Static credentials are only passed when explicitly set (local dev / non-EC2 hosts).
      // On EC2 with an attached IAM role, omit these and the SDK's default credential
      // provider chain resolves temporary credentials from the instance metadata service.
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }
  return s3;
}

/**
 * Step 1 of the upload flow: validate MIME/size, create a `pending` storage_assets row, and
 * return a time-limited presigned PUT URL (AWS SigV4) for the browser to upload directly to
 * S3 — no bytes pass through our server.
 */
export async function signUpload(request: UploadSignRequest, createdBy: number | null) {
  const client = getS3Client();
  const bucket = getBucketName();
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

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: request.contentType }),
    { expiresIn: 15 * 60 }
  );

  return {
    uploadUrl,
    objectKey,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    pendingAssetId: inserted[0].id,
  };
}

/** Step 2 of the upload flow: verifies the object landed in S3, computes a checksum, and marks the asset ready. */
export async function confirmUpload(pendingAssetId: number, actorId: number | null): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, pendingAssetId)).limit(1);
  if (!asset) throw new NotFoundError("الملف غير موجود");

  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: asset.objectKey }));
  } catch {
    throw new ConflictError("لم يتم استلام الملف في التخزين بعد");
  }

  await db
    .update(schema.storageAssets)
    .set({ processingStatus: "ready", checksum: head.ETag ?? null, sizeBytes: head.ContentLength ?? asset.sizeBytes })
    .where(eq(schema.storageAssets.id, pendingAssetId));

  await enqueueJob("search_index", { entityType: "storage_assets", entityId: pendingAssetId });
  await recordAuditLog({ actorUserId: actorId, action: "media.confirm_upload", entityType: "storage_assets", entityId: pendingAssetId, requestId: null });
}

export async function deleteStorageAsset(id: number, actorId: number | null): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  const db = getDb();
  const [asset] = await db.select().from(schema.storageAssets).where(eq(schema.storageAssets.id, id)).limit(1);
  if (!asset) throw new NotFoundError("الملف غير موجود");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }));
  await db.delete(schema.storageAssets).where(eq(schema.storageAssets.id, id));
  await recordAuditLog({ actorUserId: actorId, action: "media.delete", entityType: "storage_assets", entityId: id, before: asset, requestId: null });
}

/**
 * Public delivery URL for a ready asset. Uses a CloudFront distribution or the bucket's
 * public website/REST endpoint if `AWS_S3_PUBLIC_BASE_URL` is configured; falls back to an
 * app-served `/media/:objectKey` route otherwise. Private/staff-only assets should use a
 * short-lived signed GET URL instead of this (not yet wired — see docs/SECURITY.md).
 */
export function publicAssetUrl(objectKey: string): string {
  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (publicBase) return `${publicBase.replace(/\/$/, "")}/${objectKey}`;
  return `/media/${objectKey}`;
}
