import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { updatePartner } from "@/server/services/directory-service";

const patchSchema = z.object({
  nameAr: z.string().trim().min(2).max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  descriptionAr: z.string().trim().max(2000).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  website: z.string().trim().url().max(300).optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

/** PATCH /api/v1/admin/partners/:id */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "partners.manage");
    const { id } = await params;
    const patch = await parseJsonBody(request, patchSchema);
    await updatePartner(Number(id), patch, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
