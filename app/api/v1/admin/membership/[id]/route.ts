import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { getAdminMembershipApplicationDetail } from "@/server/services/membership-service";

/** GET /api/v1/admin/membership/:id — full application detail (profile, files, history, open actions). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "membership.review");
    const { id } = await params;
    const detail = await getAdminMembershipApplicationDetail(Number(id));
    return jsonOk(detail, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
