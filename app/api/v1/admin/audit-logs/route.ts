import { and, desc, eq, lt } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";

/** GET /api/v1/admin/audit-logs?entityType&cursor&limit — filterable, read-only audit trail. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "audit.view");
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

    const db = getDb();
    const conditions = [];
    if (entityType) conditions.push(eq(schema.auditLogs.entityType, entityType));
    if (cursor) conditions.push(lt(schema.auditLogs.id, Number(cursor)));

    const rows = await db
      .select()
      .from(schema.auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return jsonOk(page, requestId, { meta: { nextCursor: hasMore ? String(page[page.length - 1].id) : null, limit } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
