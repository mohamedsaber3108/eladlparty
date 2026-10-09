import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listAdminMembershipApplications } from "@/server/services/membership-service";
import { recordAuditLog } from "@/server/services/audit-service";

/** GET /api/v1/admin/membership/export — exportable membership application list. Every export is audit-logged. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "membership.export");
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await listAdminMembershipApplications(status);
    await recordAuditLog({ actorUserId: user.id, action: "membership.export", entityType: "membership_applications", entityId: null, requestId });
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
