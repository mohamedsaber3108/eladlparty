import { eq } from "drizzle-orm";
import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { partnershipRequestSchema } from "@/shared/contracts/intake";
import { getDb, generateReference, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";

/** POST /api/v1/partnership-requests — public partnership proposal form. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, partnershipRequestSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "partnership-request", input.website);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A", status: "received" }, requestId, { status: 201 });

    const db = getDb();
    const now = nowIso();
    const [existingContact] = await db.select().from(schema.contacts).where(eq(schema.contacts.email, input.email.toLowerCase())).limit(1);
    let contactId: number;
    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const inserted = await db
        .insert(schema.contacts)
        .values({ name: input.name, email: input.email.toLowerCase(), phone: input.phone ?? null, consentAcceptedAt: now, consentVersion: "2026-01", createdAt: now, updatedAt: now })
        .returning({ id: schema.contacts.id });
      contactId = inserted[0].id;
    }

    const reference = generateReference("PR");
    await db.insert(schema.partnershipRequests).values({
      contactId,
      organizationName: input.organizationName,
      proposal: input.proposal,
      requestedScope: input.requestedScope ?? null,
      status: "new",
      reference,
      createdAt: now,
      updatedAt: now,
    });

    await enqueueOutboxJob("notification", {
      to: input.email,
      subject: "تم استلام طلب الشراكة",
      text: `الرقم المرجعي: ${reference}. سيتواصل فريق الأمانة معك لمناقشة التفاصيل.`,
    });
    await recordAuditLog({ actorUserId: null, action: "partnership.create", entityType: "partnership_requests", entityId: reference, requestId: null });

    return jsonOk({ reference, status: "received" }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
