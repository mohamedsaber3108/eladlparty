import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { caseUpdateSchema } from "@/shared/contracts/admin";
import { getIntakeCaseDetail, updateIntakeCase } from "@/server/services/intake-service";

/** GET /api/v1/admin/intake/:id — full case detail: contact, narrative, status history, comments. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "submission.view");
    const { id } = await params;
    const detail = await getIntakeCaseDetail(Number(id));
    return jsonOk(detail, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** PATCH /api/v1/admin/intake/:id — status/priority/assignment/comment, with status-history logging. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "submission.update");
    const { id } = await params;
    const input = await parseJsonBody(request, caseUpdateSchema);
    await updateIntakeCase({ ...input, id: Number(id) }, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
