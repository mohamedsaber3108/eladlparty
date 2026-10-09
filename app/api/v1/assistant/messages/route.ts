import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { assistantMessageRequestSchema } from "@/shared/contracts/assistant";
import { answerAssistantMessage } from "@/server/services/assistant-service";

/** POST /api/v1/assistant/messages — context-aware assistant reply from approved knowledge only. Rate-limited internally. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, assistantMessageRequestSchema);
    const answer = await answerAssistantMessage(input, request);
    return jsonOk(answer, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
