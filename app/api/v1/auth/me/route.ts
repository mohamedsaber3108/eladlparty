import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getStaffSession } from "@/server/http/with-auth";

/** GET /api/v1/auth/me — resolves the current staff session (if any) via Auth.js + domain RBAC. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await getStaffSession();
    return jsonOk({ authenticated: !!user, user }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
