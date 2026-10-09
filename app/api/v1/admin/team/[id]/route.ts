import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { updateTeamMember } from "@/server/services/directory-service";

const patchSchema = z.object({
  nameAr: z.string().trim().min(2).max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  titleAr: z.string().trim().min(2).max(200).optional(),
  titleEn: z.string().trim().max(200).optional(),
  biographyAr: z.string().trim().max(2000).optional(),
  biographyEn: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

/** PATCH /api/v1/admin/team/:id */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.update");
    const { id } = await params;
    const patch = await parseJsonBody(request, patchSchema);
    await updateTeamMember(Number(id), patch, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
