import { requestIdFrom } from "@/server/http/request-id";
import { toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { magicLinkVerifySchema } from "@/shared/contracts/auth";
import { verifyMagicLink } from "@/server/services/auth-service";
import { dataResponse } from "@/shared/contracts/common";

/** POST /api/v1/auth/verify — exchanges a magic-link token for a staff session (sets session + CSRF cookies). */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { token } = await parseJsonBody(request, magicLinkVerifySchema);
    const { sessionCookie, csrfCookie } = await verifyMagicLink(token, request);
    const headers = new Headers({ "x-request-id": requestId, "content-type": "application/json" });
    headers.append("Set-Cookie", sessionCookie);
    headers.append("Set-Cookie", csrfCookie);
    return new Response(JSON.stringify(dataResponse({ authenticated: true }, requestId)), { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
