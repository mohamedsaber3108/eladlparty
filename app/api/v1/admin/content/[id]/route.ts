import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminContentUpdateSchema } from "@/shared/contracts/admin";
import { deleteContentEntry, getContentEntryById, updateContentEntry } from "@/server/services/content-service";

/** GET /api/v1/admin/content/:id */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "content.create");
    const { id } = await params;
    const entry = await getContentEntryById(Number(id));
    return jsonOk(entry, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** PATCH /api/v1/admin/content/:id — field updates + new revision snapshot. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.update");
    const { id } = await params;
    const input = await parseJsonBody(request, adminContentUpdateSchema);
    await updateContentEntry({ ...input, id: Number(id) }, user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** DELETE /api/v1/admin/content/:id — archive-first delete (published) or hard delete (draft). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "content.delete");
    const { id } = await params;
    await deleteContentEntry(Number(id), user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
