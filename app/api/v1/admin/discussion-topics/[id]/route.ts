import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminDiscussionTopicUpsertSchema } from "@/shared/contracts/monitoring";
import { upsertDiscussionTopic } from "@/server/services/discussion-service";

/** PATCH /api/v1/admin/discussion-topics/:id — updates an existing topic. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "discussion.moderate");
    const { id } = await params;
    const input = await parseJsonBody(request, adminDiscussionTopicUpsertSchema);
    await upsertDiscussionTopic(input, user.id, Number(id));
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
