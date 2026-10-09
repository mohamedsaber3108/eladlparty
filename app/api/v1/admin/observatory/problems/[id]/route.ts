import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { moderateProblem } from "@/server/services/observatory-admin-service";

const patchSchema = z.object({
  problemStatus: z.enum(["submitted", "under_review", "verified", "published", "rejected", "archived"]).optional(),
  visibility: z.enum(["private", "public"]).optional(),
  severity: z.enum(["low", "medium", "high", "unknown"]).optional(),
  sourceConfidence: z.enum(["unverified", "verified_single_source", "verified_multi_source"]).optional(),
});

/**
 * PATCH /api/v1/admin/observatory/problems/:id — moderation action. Setting `visibility=public`
 * requires `problemStatus=published`; the service does not auto-promote visibility.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "observatory.manage");
    const { id } = await params;
    const input = await parseJsonBody(request, patchSchema);
    await moderateProblem(Number(id), input, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
