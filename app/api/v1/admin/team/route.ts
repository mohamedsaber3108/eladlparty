import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { createTeamMember, listAdminTeamMembers } from "@/server/services/directory-service";

const createSchema = z.object({
  nameAr: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).optional(),
  titleAr: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().max(200).optional(),
  biographyAr: z.string().trim().max(2000).optional(),
  biographyEn: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
});

/**
 * GET/POST /api/v1/admin/team — team/leadership roster management. Per docs/OFFICIAL_CONTENT_MAP.md
 * rule 3, do not publish a leadership entry's name/title before an approved official roster exists.
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "content.create");
    const members = await listAdminTeamMembers();
    return jsonOk(members, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.create");
    const input = await parseJsonBody(request, createSchema);
    const id = await createTeamMember(
      { contentEntryId: null, nameAr: input.nameAr, nameEn: input.nameEn ?? null, titleAr: input.titleAr, titleEn: input.titleEn ?? null, biographyAr: input.biographyAr ?? null, biographyEn: input.biographyEn ?? null, imageAssetId: null, status: input.status, sortOrder: input.sortOrder },
      user.id
    );
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
