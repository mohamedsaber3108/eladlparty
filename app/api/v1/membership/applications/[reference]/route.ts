import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { assertApplicantAccess, getApplicationStatusView } from "@/server/services/membership-service";

/** GET /api/v1/membership/applications/:reference — private status/action data. Requires verified applicant access cookie. */
export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { reference } = await params;
    await assertApplicantAccess(request, reference);
    const view = await getApplicationStatusView(reference);
    return jsonOk(view, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
