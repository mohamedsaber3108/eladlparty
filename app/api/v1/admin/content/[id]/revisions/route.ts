import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listContentRevisions } from "@/server/services/content-service";

/** GET /api/v1/admin/content/:id/revisions — revision history for diffing/rollback review. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "content.create");
    const { id } = await params;
    const revisions = await listContentRevisions(Number(id));
    return jsonOk(revisions, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
