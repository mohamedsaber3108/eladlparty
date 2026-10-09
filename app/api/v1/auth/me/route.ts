import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getSessionUser } from "@/server/services/auth-service";

/** GET /api/v1/auth/me — resolves the current staff session (if any). */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await getSessionUser(request);
    return jsonOk({ authenticated: !!user, user }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
