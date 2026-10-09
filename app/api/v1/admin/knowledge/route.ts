import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { createKnowledgeEntry, listKnowledgeEntries } from "@/server/services/knowledge-service";

const createSchema = z.object({ question: z.string().trim().min(3).max(500), answer: z.string().trim().min(3).max(2000) });

/** GET /api/v1/admin/knowledge — all knowledge entries regardless of status. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "knowledge.manage");
    const entries = await listKnowledgeEntries();
    return jsonOk(entries, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/knowledge — creates a draft knowledge entry pending approval. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "knowledge.manage");
    const { question, answer } = await parseJsonBody(request, createSchema);
    const id = await createKnowledgeEntry(question, answer, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
