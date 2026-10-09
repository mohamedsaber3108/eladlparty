import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getPublicBranchBySlug } from "@/server/services/branch-service";

/** GET /api/v1/branches/:slug */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { slug } = await params;
    const branch = await getPublicBranchBySlug(slug);
    return jsonOk(branch, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
