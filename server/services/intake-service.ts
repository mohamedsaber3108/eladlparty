import { and, desc, eq, lt } from "drizzle-orm";
import { getDb, generateReference, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import type { CaseListQuery, IntakeKind } from "@/shared/contracts/intake";
import type { CaseUpdateInput } from "@/shared/contracts/admin";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";
import { hashForAudit } from "@/server/security/crypto";

export interface IntakeContactInput {
  name: string;
  email?: string;
  phone?: string;
  governorate?: string;
  profession?: string;
}

async function findOrCreateContact(input: IntakeContactInput, consentVersion: string): Promise<number> {
  const db = getDb();
  const now = nowIso();

  if (input.email) {
    const [existing] = await db.select().from(schema.contacts).where(eq(schema.contacts.email, input.email.toLowerCase())).limit(1);
    if (existing) {
      await db
        .update(schema.contacts)
        .set({
          name: input.name,
          phone: input.phone ?? existing.phone,
          governorate: input.governorate ?? existing.governorate,
          profession: input.profession ?? existing.profession,
          updatedAt: now,
        })
        .where(eq(schema.contacts.id, existing.id));
      return existing.id;
    }
  }

  const inserted = await db
    .insert(schema.contacts)
    .values({
      name: input.name,
      email: input.email?.toLowerCase() ?? null,
      phone: input.phone ?? null,
      governorate: input.governorate ?? null,
      profession: input.profession ?? null,
      consentAcceptedAt: now,
      consentVersion,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.contacts.id });
  return inserted[0].id;
}

/** Creates a durable intake case + contact + narrative detail record, queues an acknowledgement, and returns a public reference. */
export async function createIntakeCase(params: {
  kind: IntakeKind;
  contact: IntakeContactInput;
  narrativeBody: string;
  answers: Record<string, unknown>;
  sourceRoute?: string;
  request: Request;
}): Promise<{ reference: string }> {
  const db = getDb();
  const now = nowIso();
  const consentVersion = "2026-01";

  const contactId = await findOrCreateContact(params.contact, consentVersion);
  const reference = generateReference(params.kind.slice(0, 2).toUpperCase());
  const ip = params.request.headers.get("cf-connecting-ip") ?? params.request.headers.get("x-forwarded-for");

  const inserted = await db
    .insert(schema.intakeCases)
    .values({
      kind: params.kind,
      contactId,
      status: "new",
      priority: "normal",
      reference,
      sourceRoute: params.sourceRoute ?? null,
      consent: 1,
      ipHash: await hashForAudit(ip),
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.intakeCases.id });

  const caseId = inserted[0].id;
  await db.insert(schema.intakeCaseDetails).values({
    caseId,
    answersJson: JSON.stringify(params.answers),
    narrativeBody: params.narrativeBody,
    createdAt: now,
  });
  await db.insert(schema.caseStatusHistory).values({
    caseId,
    status: "new",
    note: "تم استقبال المشاركة",
    visibility: "internal",
    createdAt: now,
  });

  if (params.contact.email) {
    await enqueueOutboxJob("notification", {
      to: params.contact.email,
      subject: "تم استلام مشاركتك — أمانة ريادة الأعمال المركزية",
      text: `وصلت مشاركتك بنجاح. الرقم المرجعي: ${reference}. سيراجع فريق الأمانة الطلب ويتواصل معك عند الحاجة.`,
    });
  }

  await recordAuditLog({ actorUserId: null, action: "intake.create", entityType: "intake_cases", entityId: caseId, requestId: null, ip });
  return { reference };
}

export async function listIntakeCases(query: CaseListQuery) {
  const db = getDb();
  const conditions = [];
  if (query.kind) conditions.push(eq(schema.intakeCases.kind, query.kind));
  if (query.status) conditions.push(eq(schema.intakeCases.status, query.status));
  if (query.assignedTo) conditions.push(eq(schema.intakeCases.assignedTo, query.assignedTo));
  if (query.cursor) conditions.push(lt(schema.intakeCases.id, Number(query.cursor)));

  const rows = await db
    .select({ caseRow: schema.intakeCases, contact: schema.contacts })
    .from(schema.intakeCases)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.intakeCases.contactId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.intakeCases.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    items: page.map((r) => ({
      id: r.caseRow.id,
      kind: r.caseRow.kind,
      status: r.caseRow.status,
      priority: r.caseRow.priority,
      reference: r.caseRow.reference,
      assignedTo: r.caseRow.assignedTo,
      createdAt: r.caseRow.createdAt,
      contact: { name: r.contact.name, email: r.contact.email, phone: r.contact.phone },
    })),
    nextCursor: hasMore ? String(page[page.length - 1].caseRow.id) : null,
  };
}

export async function getIntakeCaseDetail(id: number) {
  const db = getDb();
  const [caseRow] = await db.select().from(schema.intakeCases).where(eq(schema.intakeCases.id, id)).limit(1);
  if (!caseRow) throw new NotFoundError("الحالة غير موجودة");
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, caseRow.contactId)).limit(1);
  const [detail] = await db.select().from(schema.intakeCaseDetails).where(eq(schema.intakeCaseDetails.caseId, id)).limit(1);
  const history = await db.select().from(schema.caseStatusHistory).where(eq(schema.caseStatusHistory.caseId, id)).orderBy(desc(schema.caseStatusHistory.createdAt));
  const comments = await db.select().from(schema.caseComments).where(eq(schema.caseComments.caseId, id)).orderBy(desc(schema.caseComments.createdAt));
  return { case: caseRow, contact, detail, history, comments };
}

/** Updates status/priority/assignment, appends a status-history row, and optionally a comment. */
export async function updateIntakeCase(input: CaseUpdateInput, actorId: number | null): Promise<void> {
  const db = getDb();
  const [existing] = await db.select().from(schema.intakeCases).where(eq(schema.intakeCases.id, input.id)).limit(1);
  if (!existing) throw new NotFoundError("الحالة غير موجودة");

  const now = nowIso();
  const patch: Partial<typeof schema.intakeCases.$inferInsert> = { updatedAt: now };
  if (input.status) patch.status = input.status;
  if (input.priority) patch.priority = input.priority;
  if (input.assignedTo !== undefined) patch.assignedTo = input.assignedTo;

  await db.update(schema.intakeCases).set(patch).where(eq(schema.intakeCases.id, input.id));

  if (input.status) {
    await db.insert(schema.caseStatusHistory).values({
      caseId: input.id,
      status: input.status,
      note: input.note ?? null,
      actorUserId: actorId,
      visibility: input.noteVisibility ?? "internal",
      createdAt: now,
    });
  } else if (input.note) {
    await db.insert(schema.caseComments).values({ caseId: input.id, authorUserId: actorId, body: input.note, internal: input.noteVisibility === "public" ? 0 : 1, createdAt: now });
  }

  if (input.assignedTo !== undefined && input.assignedTo !== null) {
    await db.insert(schema.caseAssignments).values({ caseId: input.id, userId: input.assignedTo, assignedBy: actorId, assignedAt: now });
  }

  await recordAuditLog({ actorUserId: actorId, action: "intake.update", entityType: "intake_cases", entityId: input.id, before: existing, after: input, requestId: null });
}
