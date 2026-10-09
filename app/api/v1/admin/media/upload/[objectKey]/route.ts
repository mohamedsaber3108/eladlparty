import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { receiveUploadBytes } from "@/server/storage/r2-storage";

/**
 * PUT /api/v1/admin/media/upload/:objectKey — receives the raw upload bytes and writes them to
 * R2. This is the fallback used in place of a true presigned S3 PUT URL (see
 * server/storage/r2-storage.ts for why) — the browser PUTs directly to this authenticated
 * Worker endpoint instead of to R2 directly.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ objectKey: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "media.upload");
    const { objectKey } = await params;
    const contentType = request.headers.get("content-type") ?? "application/octet-stream";
    const body = await request.arrayBuffer();
    await receiveUploadBytes(decodeURIComponent(objectKey), body, contentType);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
