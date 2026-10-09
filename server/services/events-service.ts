import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb, generateReference, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import type { EventCard, EventDetail, EventListQuery, EventRegistrationInput } from "@/shared/contracts/events";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";

async function toEventCard(event: typeof schema.events.$inferSelect, entry: typeof schema.contentEntries.$inferSelect): Promise<EventCard> {
  let capacityRemaining: number | null = null;
  if (event.capacity != null) {
    const db = getDb();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.eventRegistrations)
      .where(and(eq(schema.eventRegistrations.eventId, event.id), eq(schema.eventRegistrations.status, "confirmed")));
    capacityRemaining = Math.max(event.capacity - count, 0);
  }
  const now = nowIso();
  return {
    id: entry.id,
    contentType: "news",
    slug: entry.canonicalSlug,
    locale: entry.locale as EventCard["locale"],
    title: entry.title,
    excerpt: entry.excerpt,
    coverImageUrl: null,
    featured: entry.featured === 1,
    publishedAt: entry.publishedAt,
    categories: [],
    tags: [],
    href: `/events/${entry.canonicalSlug}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    format: event.format as EventCard["format"],
    venueName: event.venueName,
    eventStatus: event.eventStatus as EventCard["eventStatus"],
    registrationMode: event.registrationMode as EventCard["registrationMode"],
    registrationOpen:
      event.registrationMode === "internal" &&
      (!event.registrationOpenAt || event.registrationOpenAt <= now) &&
      (!event.registrationCloseAt || event.registrationCloseAt >= now),
    capacityRemaining,
  };
}

export async function listPublicEvents(query: EventListQuery): Promise<{ items: EventCard[]; nextCursor: string | null }> {
  const db = getDb();
  const now = nowIso();
  const conditions = [eq(schema.contentEntries.status, "published"), eq(schema.contentEntries.locale, query.locale), eq(schema.events.eventStatus, "published")];
  if (query.when === "upcoming") conditions.push(gte(schema.events.startsAt, now));
  if (query.when === "past") conditions.push(lt(schema.events.startsAt, now));
  if (query.cursor) conditions.push(lt(schema.events.id, Number(query.cursor)));

  const rows = await db
    .select({ event: schema.events, entry: schema.contentEntries })
    .from(schema.events)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.events.contentEntryId))
    .where(and(...conditions))
    .orderBy(query.when === "past" ? desc(schema.events.startsAt) : schema.events.startsAt)
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const items = await Promise.all(page.map((r) => toEventCard(r.event, r.entry)));
  return { items, nextCursor: hasMore ? String(page[page.length - 1].event.id) : null };
}

export async function getPublicEventBySlug(slug: string, locale: "ar" | "en"): Promise<EventDetail> {
  const db = getDb();
  const [row] = await db
    .select({ event: schema.events, entry: schema.contentEntries })
    .from(schema.events)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.events.contentEntryId))
    .where(and(eq(schema.contentEntries.canonicalSlug, slug), eq(schema.contentEntries.locale, locale), eq(schema.contentEntries.status, "published")))
    .limit(1);
  if (!row) throw new NotFoundError("الفعالية غير متاحة");
  const card = await toEventCard(row.event, row.entry);
  return { ...card, body: row.entry.bodyRichtext, venueAddress: row.event.venueAddress, timezone: row.event.timezone, externalRegistrationUrl: row.event.externalRegistrationUrl };
}

/** Registers a contact for an event, enforcing registration window, capacity (waitlist overflow), and de-duplication. */
export async function registerForEvent(eventSlug: string, locale: "ar" | "en", input: EventRegistrationInput, request: Request): Promise<{ reference: string; status: string }> {
  const db = getDb();
  const [row] = await db
    .select({ event: schema.events, entry: schema.contentEntries })
    .from(schema.events)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.events.contentEntryId))
    .where(and(eq(schema.contentEntries.canonicalSlug, eventSlug), eq(schema.contentEntries.locale, locale)))
    .limit(1);
  if (!row) throw new NotFoundError("الفعالية غير موجودة");
  const { event } = row;

  if (event.registrationMode !== "internal") throw new ConflictError("التسجيل الداخلي غير مفعل لهذه الفعالية");
  const now = nowIso();
  if (event.registrationOpenAt && event.registrationOpenAt > now) throw new ConflictError("التسجيل لم يفتح بعد");
  if (event.registrationCloseAt && event.registrationCloseAt < now) throw new ConflictError("انتهت فترة التسجيل");

  const [existingContact] = await db.select().from(schema.contacts).where(eq(schema.contacts.email, input.email.toLowerCase())).limit(1);
  let contactId: number;
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const inserted = await db
      .insert(schema.contacts)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        governorate: input.governorate ?? null,
        consentAcceptedAt: now,
        consentVersion: "2026-01",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: schema.contacts.id });
    contactId = inserted[0].id;
  }

  const [dupe] = await db
    .select()
    .from(schema.eventRegistrations)
    .where(and(eq(schema.eventRegistrations.eventId, event.id), eq(schema.eventRegistrations.contactId, contactId)))
    .limit(1);
  if (dupe) throw new ConflictError("هذا البريد مسجل مسبقًا لهذه الفعالية");

  let status = "confirmed";
  if (event.capacity != null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.eventRegistrations)
      .where(and(eq(schema.eventRegistrations.eventId, event.id), eq(schema.eventRegistrations.status, "confirmed")));
    if (count >= event.capacity) status = "waitlisted";
  }

  const reference = generateReference("EV");
  await db.insert(schema.eventRegistrations).values({
    eventId: event.id,
    contactId,
    status,
    consent: 1,
    answersJson: JSON.stringify(input.answers ?? {}),
    source: "web",
    reference,
    createdAt: now,
    updatedAt: now,
  });

  await enqueueOutboxJob("notification", {
    to: input.email,
    subject: status === "confirmed" ? "تأكيد التسجيل في الفعالية" : "تم إدراجك في قائمة الانتظار",
    text: `الرقم المرجعي: ${reference}. الحالة: ${status === "confirmed" ? "مؤكد" : "قائمة انتظار"}.`,
  });

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  await recordAuditLog({ actorUserId: null, action: "event.register", entityType: "event_registrations", entityId: reference, requestId: null, ip });
  return { reference, status };
}

export async function listEventRegistrations(eventId: number, actorId: number | null) {
  const db = getDb();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
  if (!event) throw new NotFoundError("الفعالية غير موجودة");
  const rows = await db
    .select({ registration: schema.eventRegistrations, contact: schema.contacts })
    .from(schema.eventRegistrations)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.eventRegistrations.contactId))
    .where(eq(schema.eventRegistrations.eventId, eventId))
    .orderBy(desc(schema.eventRegistrations.createdAt));
  await recordAuditLog({ actorUserId: actorId, action: "event.export_registrations", entityType: "events", entityId: eventId, requestId: null });
  return rows;
}
