import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicBranches } from "@/server/services/branch-service";

/** GET /api/v1/branches — active party branches/headquarters. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const branches = await listPublicBranches();
    return jsonOk(branches, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
