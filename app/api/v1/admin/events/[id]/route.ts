import { z } from "zod";
import { eq } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse, NotFoundError } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { recordAuditLog } from "@/server/services/audit-service";

const patchSchema = z.object({
  eventStatus: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
  capacity: z.number().int().positive().nullable().optional(),
  registrationMode: z.enum(["internal", "external", "closed", "not_required"]).optional(),
  registrationOpenAt: z.string().nullable().optional(),
  registrationCloseAt: z.string().nullable().optional(),
});

/** PATCH /api/v1/admin/events/:id — updates event-specific fields (status/capacity/registration window). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "events.manage");
    const { id } = await params;
    const eventId = Number(id);
    const patch = await parseJsonBody(request, patchSchema);

    const db = getDb();
    const [existing] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
    if (!existing) throw new NotFoundError("الفعالية غير موجودة");

    await db.update(schema.events).set({ ...patch, updatedAt: nowIso() }).where(eq(schema.events.id, eventId));
    await recordAuditLog({ actorUserId: user.id, action: "events.update", entityType: "events", entityId: eventId, before: existing, after: patch, requestId: null });
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
