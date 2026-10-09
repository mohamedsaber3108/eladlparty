import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { magicLinkRequestSchema } from "@/shared/contracts/auth";
import { requestMagicLink } from "@/server/services/auth-service";

/** POST /api/v1/auth/magic-link — requests a one-time sign-in link. Always 200s (no account enumeration). */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { email } = await parseJsonBody(request, magicLinkRequestSchema);
    await requestMagicLink(email, request);
    return jsonOk({ sent: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
