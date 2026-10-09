import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicTeamMembers } from "@/server/services/directory-service";

/** GET /api/v1/team — published team/leadership members. Names never appear here without an approved official roster entry. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const members = await listPublicTeamMembers();
    return jsonOk(
      members.map((m) => ({ id: m.id, nameAr: m.nameAr, nameEn: m.nameEn, titleAr: m.titleAr, titleEn: m.titleEn, biographyAr: m.biographyAr, biographyEn: m.biographyEn })),
      requestId
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
