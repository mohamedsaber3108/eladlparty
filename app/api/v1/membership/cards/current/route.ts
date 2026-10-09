import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireApplicantAccessReference } from "@/server/services/membership-service";
import { getCurrentMembershipCard } from "@/server/services/card-service";

/** GET /api/v1/membership/cards/current — private active card payload for the verified applicant/member. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const reference = await requireApplicantAccessReference(request);
    const card = await getCurrentMembershipCard(reference);
    return jsonOk(card, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
