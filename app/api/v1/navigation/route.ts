import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { localeSchema } from "@/shared/contracts/common";
import { getPublicNavigationTree } from "@/server/services/navigation-service";

/** GET /api/v1/navigation?locale=ar|en — public visible navigation tree. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const tree = await getPublicNavigationTree(locale);
    return jsonOk(tree, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
