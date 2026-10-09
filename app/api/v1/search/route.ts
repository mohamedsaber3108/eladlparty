import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { ValidationError } from "@/server/http/errors";
import { localeSchema } from "@/shared/contracts/common";
import { searchPublicContent } from "@/server/services/search-service";

/** GET /api/v1/search?q=&locale=&type=&cursor=&limit= — unified ranked public search over published content. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) throw new ValidationError({ q: ["يجب أن يكون طول البحث حرفين على الأقل"] });
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const type = url.searchParams.get("type") ?? undefined;
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));
    const result = await searchPublicContent({ q, locale, type, cursor, limit });
    return jsonOk(result.items, requestId, { meta: { nextCursor: result.nextCursor, query: result.query, limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
