import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getPublicShareCard } from "@/server/services/card-service";

/** GET /api/v1/membership/share/:token — public-safe share-card payload only. Fails immediately once revoked. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { token } = await params;
    const card = await getPublicShareCard(token);
    return jsonOk(card, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
