import { requestIdFrom } from "@/server/http/request-id";
import { toErrorResponse } from "@/server/http/errors";
import { revokeCurrentSession } from "@/server/services/auth-service";
import { dataResponse } from "@/shared/contracts/common";

/** POST /api/v1/auth/logout — revokes the current session and clears cookies. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { sessionCookie, csrfCookie } = await revokeCurrentSession(request);
    const headers = new Headers({ "x-request-id": requestId, "content-type": "application/json" });
    headers.append("Set-Cookie", sessionCookie);
    headers.append("Set-Cookie", csrfCookie);
    return new Response(JSON.stringify(dataResponse({ authenticated: false }, requestId)), { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
