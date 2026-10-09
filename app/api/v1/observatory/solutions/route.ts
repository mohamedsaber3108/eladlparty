import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { localeSchema } from "@/shared/contracts/common";
import { listPublicSolutions } from "@/server/services/observatory-service";

/** GET /api/v1/observatory/solutions?locale=ar|en */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const items = await listPublicSolutions(locale);
    return jsonOk(items, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
