import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicPartners } from "@/server/services/directory-service";

/** GET /api/v1/partners — published partner directory entries. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const partners = await listPublicPartners();
    return jsonOk(
      partners.map((p) => ({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn, descriptionAr: p.descriptionAr, descriptionEn: p.descriptionEn, type: p.type, website: p.website })),
      requestId
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
