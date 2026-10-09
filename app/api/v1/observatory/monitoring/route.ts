import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicMonitoringItems } from "@/server/services/monitoring-service";

/** GET /api/v1/observatory/monitoring — approved public issue/news/report monitoring outcomes only. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const items = await listPublicMonitoringItems();
    return jsonOk(items, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
