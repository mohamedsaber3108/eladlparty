import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { membershipActionCompleteSchema } from "@/shared/contracts/membership";
import { assertApplicantAccess, completeApplicationAction } from "@/server/services/membership-service";

/** POST /api/v1/membership/applications/:reference/actions/:id — applicant completes a staff-requested action. */
export async function POST(request: Request, { params }: { params: Promise<{ reference: string; id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { reference, id } = await params;
    await assertApplicantAccess(request, reference);
    const input = await parseJsonBody(request, membershipActionCompleteSchema);
    await completeApplicationAction(reference, Number(id), input);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
