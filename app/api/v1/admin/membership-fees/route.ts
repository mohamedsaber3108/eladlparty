import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminFeeRuleCreateSchema } from "@/shared/contracts/membership";
import { createFeeRule, listAdminFeeRules } from "@/server/services/fee-service";

/** GET /api/v1/admin/membership-fees — versioned current/historical fee rules. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "fees.manage");
    const rules = await listAdminFeeRules();
    return jsonOk(rules, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/membership-fees — creates a new fee rule; closes the previously-active rule (immutable history). */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "fees.manage");
    const input = await parseJsonBody(request, adminFeeRuleCreateSchema);
    const id = await createFeeRule(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
