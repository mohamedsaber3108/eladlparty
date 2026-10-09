import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminBranchUpsertSchema } from "@/shared/contracts/membership";
import { listAdminBranches, upsertBranch } from "@/server/services/branch-service";

/** GET /api/v1/admin/branches — all branches regardless of active state. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "branch.manage");
    const branches = await listAdminBranches();
    return jsonOk(branches, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/branches — creates or updates (upsert by slug) a branch. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "branch.manage");
    const input = await parseJsonBody(request, adminBranchUpsertSchema);
    const id = await upsertBranch(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
