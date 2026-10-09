import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getOrganizationStructure } from "@/server/services/directory-service";

/** GET /api/v1/organization-structure — the official org-chart tree backing /about/structure. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const tree = await getOrganizationStructure();
    return jsonOk(tree, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
