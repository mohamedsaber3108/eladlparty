import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { getAdminDashboard } from "@/server/services/dashboard-service";

/** GET /api/v1/admin/dashboard — real metrics: pending cases, scheduled content, registrations, recent activity. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "analytics.view");
    const dashboard = await getAdminDashboard();
    return jsonOk(dashboard, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
