import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { membershipVerifyConsumeSchema, membershipVerifyRequestSchema } from "@/shared/contracts/membership";
import { consumeApplicationAccess, requestApplicationAccess } from "@/server/services/membership-service";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { dataResponse } from "@/shared/contracts/common";

/**
 * POST /api/v1/membership/applications/:reference/verify — issues (body: `{email}`) or
 * consumes (body: `{token}`) a one-time applicant-access verification link.
 */
export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { reference } = await params;
    const raw = await request.clone().json().catch(() => ({}));

    if ("token" in raw) {
      const { token } = membershipVerifyConsumeSchema.parse(raw);
      const cookie = await consumeApplicationAccess(reference, token);
      const headers = new Headers({ "x-request-id": requestId, "content-type": "application/json", "Set-Cookie": cookie });
      return new Response(JSON.stringify(dataResponse({ verified: true }, requestId)), { status: 200, headers });
    }

    const { email } = await parseJsonBody(request, membershipVerifyRequestSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "membership-verify", "", 5, 15 * 60 * 1000);
    if (!isHoneypotTriggered) await requestApplicationAccess(reference, email);
    return jsonOk({ sent: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
