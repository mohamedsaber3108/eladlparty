import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { localeSchema } from "@/shared/contracts/common";
import { listPublicProblems } from "@/server/services/observatory-service";

/** GET /api/v1/observatory/problems?locale&cursor&limit — only published AND public-visibility problem records. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));
    const { items, nextCursor } = await listPublicProblems(locale, cursor, limit);
    return jsonOk(items, requestId, { meta: { nextCursor, limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
