import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { shareLinkActionSchema } from "@/shared/contracts/membership";
import { requireApplicantAccessReference } from "@/server/services/membership-service";
import { createShareLink, revokeShareLink } from "@/server/services/card-service";

/** POST /api/v1/membership/cards/:id/share-link — create or revoke a share link. Only for the active member who owns the card. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const reference = await requireApplicantAccessReference(request);
    const { id } = await params;
    const { action } = await parseJsonBody(request, shareLinkActionSchema);

    if (action === "create") {
      const token = await createShareLink(reference, Number(id), null);
      const baseUrl = new URL(request.url).origin;
      return jsonOk({ shareUrl: `${baseUrl}/membership/share/${token}`, shareEnabled: true }, requestId);
    }

    await revokeShareLink(reference, Number(id), null);
    return jsonOk({ shareUrl: null, shareEnabled: false }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
