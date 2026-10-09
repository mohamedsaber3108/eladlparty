import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { adminContentCreateSchema, adminContentListQuerySchema } from "@/shared/contracts/admin";
import { createContentEntry, listAdminContent } from "@/server/services/content-service";

/** GET /api/v1/admin/content?type&status&locale&cursor&limit — any status, any locale. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "content.create");
    const url = new URL(request.url);
    const query = parseQuery(url, adminContentListQuerySchema);
    const { items, nextCursor } = await listAdminContent(query);
    return jsonOk(items, requestId, { meta: { nextCursor, limit: query.limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/content — creates a draft (or directly published, if status is set) content entry. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.create");
    const input = await parseJsonBody(request, adminContentCreateSchema);
    const id = await createContentEntry(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
