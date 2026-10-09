import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { listAdminGovernorates, upsertGovernorate } from "@/server/services/directory-service";

const upsertSchema = z.object({
  governorate: z.string().trim().min(2).max(100),
  overviewAr: z.string().trim().max(2000).optional(),
  overviewEn: z.string().trim().max(2000).optional(),
  localStatus: z.enum(["planned", "active", "paused"]).default("planned"),
  status: z.enum(["draft", "published"]).default("draft"),
});

/** GET /api/v1/admin/governorates */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "content.create");
    const rows = await listAdminGovernorates();
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/governorates — upserts by governorate name. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.create");
    const input = await parseJsonBody(request, upsertSchema);
    const id = await upsertGovernorate(
      { governorate: input.governorate, overviewAr: input.overviewAr ?? null, overviewEn: input.overviewEn ?? null, localStatus: input.localStatus, coordinatorContactId: null, coverageIndicatorsJson: "{}", status: input.status },
      user.id
    );
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
