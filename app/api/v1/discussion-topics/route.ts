import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { listPublicDiscussionTopics } from "@/server/services/discussion-service";

/** GET /api/v1/discussion-topics — publicly open discussion topics only. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const topics = await listPublicDiscussionTopics();
    return jsonOk(topics, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
