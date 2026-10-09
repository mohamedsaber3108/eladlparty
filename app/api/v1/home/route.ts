import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getHomeAggregate } from "@/server/services/home-service";
import { localeSchema } from "@/shared/contracts/common";

/** GET /api/v1/home — one aggregated homepage response: published featured content, upcoming events, programs/initiatives/calls. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const data = await getHomeAggregate(locale);
    return jsonOk(data, requestId, {
      status: 200,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
