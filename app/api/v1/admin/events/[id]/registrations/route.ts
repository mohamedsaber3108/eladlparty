import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { listEventRegistrations } from "@/server/services/events-service";

/** GET /api/v1/admin/events/:id/registrations — exportable registration list. Logged via audit on every call. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "events.manage");
    const { id } = await params;
    const rows = await listEventRegistrations(Number(id), user.id);
    return jsonOk(rows, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
