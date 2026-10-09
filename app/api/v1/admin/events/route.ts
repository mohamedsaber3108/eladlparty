import { z } from "zod";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { createContentEntry } from "@/server/services/content-service";
import { recordAuditLog } from "@/server/services/audit-service";

const createEventSchema = z.object({
  canonicalSlug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/),
  locale: z.enum(["ar", "en"]).default("ar"),
  title: z.string().trim().min(3).max(300),
  excerpt: z.string().trim().min(3).max(600),
  bodyRichtext: z.string().trim().min(1),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  timezone: z.string().default("Africa/Cairo"),
  format: z.enum(["in_person", "online", "hybrid"]).default("in_person"),
  venueName: z.string().trim().max(300).optional(),
  venueAddress: z.string().trim().max(500).optional(),
  capacity: z.number().int().positive().optional(),
  registrationMode: z.enum(["internal", "external", "closed", "not_required"]).default("internal"),
  registrationOpenAt: z.string().optional(),
  registrationCloseAt: z.string().optional(),
  externalRegistrationUrl: z.string().trim().url().optional(),
});

/** POST /api/v1/admin/events — creates the content_entries draft and its typed events row together. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "events.manage");
    const input = await parseJsonBody(request, createEventSchema);

    const entryId = await createContentEntry(
      { contentType: "news", canonicalSlug: input.canonicalSlug, locale: input.locale, title: input.title, excerpt: input.excerpt, bodyRichtext: input.bodyRichtext, featured: false, status: "draft", tags: [] },
      user.id
    );

    const db = getDb();
    const now = nowIso();
    const inserted = await db
      .insert(schema.events)
      .values({
        contentEntryId: entryId,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        timezone: input.timezone,
        format: input.format,
        venueName: input.venueName ?? null,
        venueAddress: input.venueAddress ?? null,
        capacity: input.capacity ?? null,
        registrationMode: input.registrationMode,
        registrationOpenAt: input.registrationOpenAt ?? null,
        registrationCloseAt: input.registrationCloseAt ?? null,
        eventStatus: "draft",
        externalRegistrationUrl: input.externalRegistrationUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: schema.events.id });

    await recordAuditLog({ actorUserId: user.id, action: "events.create", entityType: "events", entityId: inserted[0].id, after: input, requestId: null });
    return jsonOk({ contentEntryId: entryId, eventId: inserted[0].id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
