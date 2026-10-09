import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { adminMembershipDecisionSchema } from "@/shared/contracts/membership";
import { decideMembershipApplication } from "@/server/services/membership-service";
import { hasPermission } from "@/server/policies/rbac";
import { ForbiddenError, UnauthorizedError } from "@/server/http/errors";
import { getSessionUser } from "@/server/services/auth-service";
import { assertCsrfValid } from "@/server/services/auth-service";
import type { AdminMembershipDecisionInput } from "@/shared/contracts/membership";

/** Maps each state-machine action to the permission required to perform it. */
const actionPermission: Record<AdminMembershipDecisionInput["action"], "membership.decide" | "membership.complete" | "membership.card.issue"> = {
  assign_reviewer: "membership.decide",
  request_action: "membership.decide",
  accept_in_principle: "membership.decide",
  reject: "membership.decide",
  select_branch: "membership.decide",
  mark_fee_paid: "membership.complete",
  mark_fee_waived: "membership.complete",
  verify_documents: "membership.complete",
  book_appointment: "membership.complete",
  mark_attended: "membership.complete",
  complete: "membership.complete",
  issue_card: "membership.card.issue",
  revoke_membership: "membership.decide",
  suspend_membership: "membership.decide",
};

/**
 * POST /api/v1/admin/membership/:id/decide — runs one state-machine action. `membership.review`
 * grants read access only; the actual action requires `membership.decide`, `membership.complete`,
 * or `membership.card.issue` depending on which action is requested (branch_staff only holds
 * `membership.complete`, so it cannot accept/reject/issue cards — per the brief's role split).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedError();
    assertCsrfValid(request);

    const { id } = await params;
    const input = await parseJsonBody(request, adminMembershipDecisionSchema);

    const requiredPermission = actionPermission[input.action];
    if (!hasPermission(user, requiredPermission)) {
      throw new ForbiddenError(`الصلاحية المطلوبة غير متاحة لتنفيذ هذا الإجراء: ${requiredPermission}`);
    }

    await decideMembershipApplication(Number(id), input, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
