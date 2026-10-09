import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { approveKnowledgeEntry, archiveKnowledgeEntry } from "@/server/services/knowledge-service";

const actionSchema = z.object({ action: z.enum(["approve", "archive"]) });

/** PATCH /api/v1/admin/knowledge/:id — approve (queues assistant ingestion) or archive. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "knowledge.manage");
    const { id } = await params;
    const { action } = await parseJsonBody(request, actionSchema);
    if (action === "approve") await approveKnowledgeEntry(Number(id), user.id);
    else await archiveKnowledgeEntry(Number(id), user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
