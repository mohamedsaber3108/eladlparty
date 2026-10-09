import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseQuery } from "@/server/http/validate";
import { contentListQuerySchema } from "@/shared/contracts/content";
import { listPublicContent } from "@/server/services/content-service";

/**
 * GET /api/v1/content?type&locale&category&tag&featured&q&cursor&limit&sort
 * Public listing: only published records for the given locale. Cursor-paginated.
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const query = parseQuery(url, contentListQuerySchema);
    const { items, nextCursor } = await listPublicContent(query);
    return jsonOk(items, requestId, { meta: { nextCursor, limit: query.limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
