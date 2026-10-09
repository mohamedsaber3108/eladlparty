import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminMonitoringSourceUpsertSchema } from "@/shared/contracts/monitoring";
import { createMonitoringSource, listMonitoringSources } from "@/server/services/monitoring-service";

/** GET /api/v1/admin/monitoring/sources */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "monitoring.manage_sources");
    const sources = await listMonitoringSources();
    return jsonOk(sources, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/monitoring/sources — a source can only be active once legalReviewStatus=approved. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "monitoring.manage_sources");
    const input = await parseJsonBody(request, adminMonitoringSourceUpsertSchema);
    const id = await createMonitoringSource(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
