import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminContentPublishActionSchema } from "@/shared/contracts/admin";
import { transitionContentEntry } from "@/server/services/content-service";

/** POST /api/v1/admin/content/:id/publish — lifecycle transition (submit_review/approve/request_changes/publish/unpublish/schedule/archive). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.publish");
    const { id } = await params;
    const input = await parseJsonBody(request, adminContentPublishActionSchema);
    await transitionContentEntry({ ...input, id: Number(id) }, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
