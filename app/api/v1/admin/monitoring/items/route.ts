import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminMonitoringItemCreateSchema } from "@/shared/contracts/monitoring";
import { createMonitoringItem, listMonitoringItems } from "@/server/services/monitoring-service";

/** GET /api/v1/admin/monitoring/items?visibility= */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "monitoring.review");
    const url = new URL(request.url);
    const visibility = url.searchParams.get("visibility") as "private" | "public" | null;
    const rows = await listMonitoringItems(visibility ?? undefined);
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/monitoring/items — analyst promotes an ingestion candidate into a structured (still-private) item. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "monitoring.review");
    const input = await parseJsonBody(request, adminMonitoringItemCreateSchema);
    const id = await createMonitoringItem(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
