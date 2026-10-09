import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { createPartner, listAdminPartners } from "@/server/services/directory-service";

const createSchema = z.object({
  nameAr: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).optional(),
  descriptionAr: z.string().trim().max(2000).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  type: z.enum(["university", "private_sector", "investment_fund", "incubator", "tech_company", "organization", "other"]).default("other"),
  website: z.string().trim().url().max(300).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

/** GET /api/v1/admin/partners — all partners regardless of publish status. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "partners.manage");
    const partners = await listAdminPartners();
    return jsonOk(partners, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/partners */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "partners.manage");
    const input = await parseJsonBody(request, createSchema);
    const id = await createPartner(
      { nameAr: input.nameAr, nameEn: input.nameEn ?? null, descriptionAr: input.descriptionAr ?? null, descriptionEn: input.descriptionEn ?? null, type: input.type, website: input.website ?? null, logoAssetId: null, verificationStatus: "pending", relationshipOwnerId: user.id, status: input.status },
      user.id
    );
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
