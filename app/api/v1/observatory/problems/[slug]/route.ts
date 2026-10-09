import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { localeSchema } from "@/shared/contracts/common";
import { getPublicProblemBySlug } from "@/server/services/observatory-service";

/** GET /api/v1/observatory/problems/:slug?locale=ar|en */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const detail = await getPublicProblemBySlug(slug, locale);
    return jsonOk(detail, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
