import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminUserUpsertSchema } from "@/shared/contracts/admin";
import { listStaffUsers, upsertStaffUser } from "@/server/services/users-service";

/** GET /api/v1/admin/users — staff users with their assigned roles. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "users.manage");
    const users = await listStaffUsers();
    return jsonOk(users, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/users — invites a staff user or updates an existing one's roles. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const actor = await requireStaff(request, "users.manage");
    const input = await parseJsonBody(request, adminUserUpsertSchema);
    const id = await upsertStaffUser(input, actor);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
