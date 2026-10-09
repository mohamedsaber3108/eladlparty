import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseQuery } from "@/server/http/validate";
import { eventListQuerySchema } from "@/shared/contracts/events";
import { listPublicEvents } from "@/server/services/events-service";

/** GET /api/v1/events?when=upcoming|past|all&locale&cursor&limit */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const query = parseQuery(url, eventListQuerySchema);
    const { items, nextCursor } = await listPublicEvents(query);
    return jsonOk(items, requestId, { meta: { nextCursor, limit: query.limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
