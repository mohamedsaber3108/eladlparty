import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { membershipApplicationCreateSchema } from "@/shared/contracts/membership";
import { createMembershipApplication } from "@/server/services/membership-service";

/**
 * POST /api/v1/membership/applications — creates/submits a membership application. Distinct
 * and additive to the existing /api/v1/intake/* Secretariat participation flows; membership
 * requires its own explicit consent and reference. Idempotency-key protected.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, membershipApplicationCreateSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "membership-apply", input.website, 5, 10 * 60 * 1000);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A" }, requestId, { status: 201 });

    const result = await createMembershipApplication(input, request);
    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
