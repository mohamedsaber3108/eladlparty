import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { addProblemEvidence } from "@/server/services/observatory-admin-service";

const createSchema = z.object({
  sourceType: z.enum(["report", "news", "submission", "survey", "other"]),
  citation: z.string().trim().max(500).optional(),
  url: z.string().trim().url().max(500).optional(),
  publicationDate: z.string().optional(),
});

/** POST /api/v1/admin/observatory/problems/:id/evidence — attaches a citation/source to a problem record. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "observatory.manage");
    const { id } = await params;
    const input = await parseJsonBody(request, createSchema);
    const evidenceId = await addProblemEvidence(Number(id), input, user.id);
    return jsonOk({ id: evidenceId }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
