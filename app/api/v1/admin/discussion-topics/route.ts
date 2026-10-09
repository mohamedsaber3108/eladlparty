import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminDiscussionTopicUpsertSchema } from "@/shared/contracts/monitoring";
import { listAdminDiscussionTopics, upsertDiscussionTopic } from "@/server/services/discussion-service";

/** GET /api/v1/admin/discussion-topics — all topics regardless of public status. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "discussion.moderate");
    const topics = await listAdminDiscussionTopics();
    return jsonOk(topics, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/discussion-topics — creates a topic. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "discussion.moderate");
    const input = await parseJsonBody(request, adminDiscussionTopicUpsertSchema);
    const id = await upsertDiscussionTopic(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
