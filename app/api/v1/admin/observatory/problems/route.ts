import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listAdminProblems } from "@/server/services/observatory-admin-service";

/** GET /api/v1/admin/observatory/problems — all problem reports regardless of status/visibility. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "observatory.manage");
    const items = await listAdminProblems();
    return jsonOk(items, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
