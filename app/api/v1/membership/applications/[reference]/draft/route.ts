import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { membershipApplicationDraftSchema } from "@/shared/contracts/membership";
import { assertApplicantAccess, updateApplicationDraft } from "@/server/services/membership-service";

/** PATCH /api/v1/membership/applications/:reference/draft — verified draft persistence only; never public. */
export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { reference } = await params;
    await assertApplicantAccess(request, reference);
    const input = await parseJsonBody(request, membershipApplicationDraftSchema);
    await updateApplicationDraft(reference, input);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
