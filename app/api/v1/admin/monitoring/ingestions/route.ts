import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminMonitoringIngestionCreateSchema } from "@/shared/contracts/monitoring";
import { createMonitoringIngestion, listMonitoringIngestions } from "@/server/services/monitoring-service";

/** GET /api/v1/admin/monitoring/ingestions?status= */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "monitoring.review");
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await listMonitoringIngestions(status);
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/monitoring/ingestions — manual ingestion entry. Always creates a private candidate; never publishes. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "monitoring.manage_sources");
    const input = await parseJsonBody(request, adminMonitoringIngestionCreateSchema);
    const id = await createMonitoringIngestion(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
