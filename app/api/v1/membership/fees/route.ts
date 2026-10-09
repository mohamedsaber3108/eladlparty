import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { getCurrentFeeRule } from "@/server/services/fee-service";

/** GET /api/v1/membership/fees — current public fee display, no private eligibility data. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const fee = await getCurrentFeeRule();
    return jsonOk(fee, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
