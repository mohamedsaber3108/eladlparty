import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { uploadSignRequestSchema } from "@/shared/contracts/media";
import { signUpload } from "@/server/storage/r2-storage";

/** POST /api/v1/admin/media/sign — validates MIME/size and returns an upload URL + pending asset id. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "media.upload");
    const input = await parseJsonBody(request, uploadSignRequestSchema);
    const result = await signUpload(input, user.id);
    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
