import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicGovernorates } from "@/server/services/directory-service";

/** GET /api/v1/governorates — published governorate coverage profiles. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const rows = await listPublicGovernorates();
    return jsonOk(
      rows.map((g) => ({ id: g.id, governorate: g.governorate, overviewAr: g.overviewAr, overviewEn: g.overviewEn, localStatus: g.localStatus })),
      requestId
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
