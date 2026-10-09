import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { uploadConfirmRequestSchema } from "@/shared/contracts/media";
import { confirmUpload } from "@/server/storage/r2-storage";

/** POST /api/v1/admin/media/confirm — verifies the object landed in R2 and marks the asset ready. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "media.upload");
    const { pendingAssetId } = await parseJsonBody(request, uploadConfirmRequestSchema);
    await confirmUpload(pendingAssetId, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
