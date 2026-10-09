import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { getOpportunityDetailsByEntryId, upsertOpportunityDetails } from "@/server/services/directory-service";

const upsertSchema = z.object({
  provider: z.string().trim().max(300).optional(),
  deadline: z.string().optional(),
  eligibility: z.string().trim().max(1000).optional(),
  applicationUrl: z.string().trim().url().max(500).optional(),
  opportunityStatus: z.enum(["open", "closed", "upcoming"]).default("open"),
});

/** GET /api/v1/admin/opportunities/:entryId/details */
export async function GET(request: Request, { params }: { params: Promise<{ entryId: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "opportunities.manage");
    const { entryId } = await params;
    const details = await getOpportunityDetailsByEntryId(Number(entryId));
    return jsonOk(details, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/opportunities/:entryId/details — upserts typed opportunity fields for the content entry. */
export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "opportunities.manage");
    const { entryId } = await params;
    const input = await parseJsonBody(request, upsertSchema);
    const id = await upsertOpportunityDetails(
      { contentEntryId: Number(entryId), provider: input.provider ?? null, deadline: input.deadline ?? null, eligibility: input.eligibility ?? null, applicationUrl: input.applicationUrl ?? null, opportunityStatus: input.opportunityStatus },
      user.id
    );
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
