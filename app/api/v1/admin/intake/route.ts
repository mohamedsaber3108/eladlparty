import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseQuery } from "@/server/http/validate";
import { caseListQuerySchema } from "@/shared/contracts/intake";
import { listIntakeCases } from "@/server/services/intake-service";

/** GET /api/v1/admin/intake?kind&status&assignedTo&q&cursor&limit — staff case list. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "submission.view");
    const url = new URL(request.url);
    const query = parseQuery(url, caseListQuerySchema);
    const { items, nextCursor } = await listIntakeCases(query);
    return jsonOk(items, requestId, { meta: { nextCursor, limit: query.limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
