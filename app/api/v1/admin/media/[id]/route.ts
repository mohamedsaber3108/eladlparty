import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { deleteStorageAsset } from "@/server/storage/r2-storage";

/** DELETE /api/v1/admin/media/:id — deletes the R2 object and its storage_assets row. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "media.delete");
    const { id } = await params;
    await deleteStorageAsset(Number(id), user.id);
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
