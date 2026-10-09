import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listAdminMembershipApplications } from "@/server/services/membership-service";

/** GET /api/v1/admin/membership?status= — staff list of membership applications. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "membership.review");
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await listAdminMembershipApplications(status);
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
