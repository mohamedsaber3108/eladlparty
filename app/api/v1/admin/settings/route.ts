import { z } from "zod";
import { eq } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { ValidationError } from "@/server/http/errors";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { recordAuditLog } from "@/server/services/audit-service";

/** Allow-listed setting keys — only these may be written via the admin API. */
const ALLOWED_KEYS = new Set(["locale_fallback_policy", "notification_templates_enabled", "assistant_enabled", "site_announcement"]);

/** GET /api/v1/admin/settings — all allow-listed portal settings. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "settings.manage");
    const db = getDb();
    const rows = await db.select().from(schema.settings);
    return jsonOk(rows.map((r) => ({ key: r.key, value: JSON.parse(r.valueJson), updatedAt: r.updatedAt })), requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

const setSchema = z.object({ key: z.string().min(1), value: z.unknown() });

/** POST /api/v1/admin/settings — upserts a single allow-listed setting key. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "settings.manage");
    const { key, value } = await parseJsonBody(request, setSchema);
    if (!ALLOWED_KEYS.has(key)) {
      throw new ValidationError({ key: [`المفتاح "${key}" غير مسموح به`] });
    }
    const db = getDb();
    const now = nowIso();
    const [existing] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
    if (existing) {
      await db.update(schema.settings).set({ valueJson: JSON.stringify(value), updatedBy: user.id, updatedAt: now }).where(eq(schema.settings.id, existing.id));
    } else {
      await db.insert(schema.settings).values({ key, valueJson: JSON.stringify(value), updatedBy: user.id, updatedAt: now });
    }
    await recordAuditLog({ actorUserId: user.id, action: "settings.update", entityType: "settings", entityId: key, after: value, requestId: null });
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
