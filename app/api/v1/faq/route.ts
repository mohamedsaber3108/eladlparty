import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { contentListQuerySchema } from "@/shared/contracts/content";
import { listPublicContent } from "@/server/services/content-service";
import { localeSchema } from "@/shared/contracts/common";

/** GET /api/v1/faq?locale=ar|en — published FAQ entries. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const query = contentListQuerySchema.parse({ type: "faq", locale, limit: 50 });
    const { items } = await listPublicContent(query);
    return jsonOk(items, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
