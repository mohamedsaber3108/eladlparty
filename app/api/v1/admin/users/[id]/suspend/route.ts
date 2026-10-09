import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { suspendStaffUser } from "@/server/services/users-service";

/** POST /api/v1/admin/users/:id/suspend — suspends the account and revokes active sessions. Self-lockout protected. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const actor = await requireStaff(request, "users.manage");
    const { id } = await params;
    await suspendStaffUser(Number(id), actor);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
