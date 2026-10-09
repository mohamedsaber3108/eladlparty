import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { getProgramDetailsByEntryId, upsertProgramDetails } from "@/server/services/directory-service";

const upsertSchema = z.object({
  audience: z.string().trim().max(300).optional(),
  eligibility: z.string().trim().max(1000).optional(),
  deliveryMode: z.string().trim().max(100).optional(),
  applicationOpenAt: z.string().optional(),
  applicationCloseAt: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  applicationMode: z.enum(["none", "internal", "external"]).default("none"),
});

/** GET /api/v1/admin/programs/:entryId/details — typed program fields joined to a content_entries row. */
export async function GET(request: Request, { params }: { params: Promise<{ entryId: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "programs.manage");
    const { entryId } = await params;
    const details = await getProgramDetailsByEntryId(Number(entryId));
    return jsonOk(details, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/programs/:entryId/details — upserts typed program fields for the content entry. */
export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "programs.manage");
    const { entryId } = await params;
    const input = await parseJsonBody(request, upsertSchema);
    const id = await upsertProgramDetails(
      {
        contentEntryId: Number(entryId),
        audience: input.audience ?? null,
        eligibility: input.eligibility ?? null,
        deliveryMode: input.deliveryMode ?? null,
        applicationOpenAt: input.applicationOpenAt ?? null,
        applicationCloseAt: input.applicationCloseAt ?? null,
        capacity: input.capacity ?? null,
        applicationMode: input.applicationMode,
        ownerUserId: user.id,
      },
      user.id
    );
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
