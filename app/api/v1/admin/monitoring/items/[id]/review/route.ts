import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminMonitoringItemReviewSchema } from "@/shared/contracts/monitoring";
import { reviewMonitoringItem } from "@/server/services/monitoring-service";

/** POST /api/v1/admin/monitoring/items/:id/review — reviewer verification + the only path to public visibility. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "monitoring.review");
    const { id } = await params;
    const input = await parseJsonBody(request, adminMonitoringItemReviewSchema);
    await reviewMonitoringItem(Number(id), input, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
