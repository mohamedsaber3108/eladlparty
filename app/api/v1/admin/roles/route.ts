import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listRoles } from "@/server/services/users-service";

/** GET /api/v1/admin/roles — the fixed role catalogue (keys + labels) used by the users admin screen. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "roles.manage");
    const roles = await listRoles();
    return jsonOk(roles, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
