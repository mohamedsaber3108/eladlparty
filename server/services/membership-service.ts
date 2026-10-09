import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb, generateReference, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/server/http/errors";
import { hmacSha256Hex, randomToken, sha256Hex } from "@/server/security/crypto";
import { enqueueOutboxJob } from "@/server/jobs/outbox";
import { recordAuditLog } from "@/server/services/audit-service";
import { getBranchById } from "@/server/services/branch-service";
import { getCurrentFeeRule } from "@/server/services/fee-service";
import type {
  AdminMembershipDecisionInput,
  MembershipActionCompleteInput,
  MembershipApplicationCreateInput,
  MembershipApplicationDraftInput,
  MembershipApplicationStatusView,
} from "@/shared/contracts/membership";

const VERIFY_TOKEN_TTL_MS = 15 * 60 * 1000;
const ACCESS_COOKIE = "eladl_applicant_access";
const ACCESS_TTL_SECONDS = 30 * 60;

function applicantAccessSecret(): string {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured. Required for applicant verification access.");
  return secret;
}

// ---------------------------------------------------------------------------
// Create / submit
// ---------------------------------------------------------------------------

export async function createMembershipApplication(input: MembershipApplicationCreateInput, request: Request): Promise<{ reference: string }> {
  const db = getDb();
  const now = nowIso();

  // Idempotency: if this key was already used, return the existing reference rather than
  // creating a duplicate application.
  const [existingByKey] = await db
    .select()
    .from(schema.membershipApplications)
    .where(eq(schema.membershipApplications.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existingByKey) return { reference: existingByKey.publicReference };

  const [existingContact] = await db.select().from(schema.contacts).where(eq(schema.contacts.email, input.email.toLowerCase())).limit(1);
  let contactId: number;
  if (existingContact) {
    contactId = existingContact.id;
    await db
      .update(schema.contacts)
      .set({ name: input.name, phone: input.phone, governorate: input.governorate, updatedAt: now })
      .where(eq(schema.contacts.id, contactId));
  } else {
    const inserted = await db
      .insert(schema.contacts)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        governorate: input.governorate,
        consentAcceptedAt: now,
        consentVersion: input.consentVersion,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: schema.contacts.id });
    contactId = inserted[0].id;
  }

  const reference = generateReference("MB");
  const applicationInserted = await db
    .insert(schema.membershipApplications)
    .values({
      publicReference: reference,
      contactId,
      applicationStatus: "submitted",
      requestedGovernorate: input.governorate,
      submittedAt: now,
      paymentStatus: "not_applicable",
      completionStatus: "not_started",
      consentVersion: input.consentVersion,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.membershipApplications.id });

  const applicationId = applicationInserted[0].id;

  await db.insert(schema.membershipApplicationProfile).values({
    applicationId,
    legalName: input.legalName ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    occupation: input.occupation ?? null,
    education: input.education ?? null,
    addressJson: JSON.stringify(input.address ?? {}),
    answersJson: JSON.stringify(input.answers ?? {}),
    updatedAt: now,
  });

  await db.insert(schema.membershipApplicationFiles).values({
    applicationId,
    storageAssetId: input.profilePhotoAssetId,
    fileType: "profile_photo",
    verificationStatus: "pending",
    createdAt: now,
  });
  for (const assetId of input.supportingDocumentAssetIds ?? []) {
    await db.insert(schema.membershipApplicationFiles).values({ applicationId, storageAssetId: assetId, fileType: "supporting_document", verificationStatus: "pending", createdAt: now });
  }

  await db.insert(schema.membershipStatusHistory).values({
    applicationId,
    status: "submitted",
    publicMessage: "تم استلام طلب العضوية بنجاح وهو قيد المراجعة.",
    actorUserId: null,
    createdAt: now,
  });

  await enqueueOutboxJob("notification", {
    to: input.email,
    subject: "تم استلام طلب العضوية — حزب العدل",
    text: `الرقم المرجعي: ${reference}. سيصلك تحديث عند مراجعة طلبك. يمكنك متابعة الحالة من صفحة متابعة الطلب.`,
  });

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  await recordAuditLog({ actorUserId: null, action: "membership.apply", entityType: "membership_applications", entityId: applicationId, requestId: null, ip });
  return { reference };
}

// ---------------------------------------------------------------------------
// Verified applicant access (one-time email link, short-lived scoped cookie)
// ---------------------------------------------------------------------------

/** Requests a one-time access link for the given reference+email pair. Always a generic outcome — never confirms a match. */
export async function requestApplicationAccess(reference: string, email: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ application: schema.membershipApplications, contact: schema.contacts })
    .from(schema.membershipApplications)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.membershipApplications.contactId))
    .where(eq(schema.membershipApplications.publicReference, reference))
    .limit(1);

  // Deliberately silent (no error) if reference/email don't match — avoids enumeration.
  if (!row || row.contact.email !== email.toLowerCase()) return;

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
  await db
    .update(schema.membershipApplications)
    .set({ verificationTokenHash: tokenHash, verificationExpiresAt: expiresAt })
    .where(eq(schema.membershipApplications.id, row.application.id));

  const baseUrl = env.PUBLIC_BASE_URL ?? "http://localhost:5173";
  const verifyUrl = `${baseUrl}/membership/status?ref=${reference}&token=${token}`;
  await enqueueOutboxJob("notification", {
    to: email,
    subject: "رابط متابعة طلب العضوية — حزب العدل",
    text: `استخدم هذا الرابط لمتابعة طلبك خلال 15 دقيقة: ${verifyUrl}`,
  });
}

/** Consumes a one-time access token and returns a signed, scoped applicant-access cookie value. */
export async function consumeApplicationAccess(reference: string, token: string): Promise<string> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);

  if (!application || !application.verificationTokenHash || application.verificationTokenHash !== tokenHash || !application.verificationExpiresAt || application.verificationExpiresAt < now) {
    throw new UnauthorizedError("رابط المتابعة غير صالح أو منتهي الصلاحية");
  }

  // One-time: clear the token hash so it cannot be replayed.
  await db.update(schema.membershipApplications).set({ verificationTokenHash: null, verificationExpiresAt: null }).where(eq(schema.membershipApplications.id, application.id));

  const expiresAtMs = Date.now() + ACCESS_TTL_SECONDS * 1000;
  const payload = `${reference}.${expiresAtMs}`;
  const signature = await hmacSha256Hex(applicantAccessSecret(), payload);
  return `${ACCESS_COOKIE}=${btoa(payload)}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ACCESS_TTL_SECONDS}`;
}

/** Resolves the verified applicant-access cookie into its reference + expiry, or null if absent/invalid/expired. */
async function readApplicantAccessCookie(request: Request): Promise<{ reference: string; expiresAtMs: number } | null> {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACCESS_COOKIE}=`))
    ?.slice(ACCESS_COOKIE.length + 1);
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const payload = atob(encoded);
  const expectedSignature = await hmacSha256Hex(applicantAccessSecret(), payload);
  if (signature !== expectedSignature) return null;

  const [payloadReference, expiresAtRaw] = payload.split(".");
  const expiresAtMs = Number(expiresAtRaw);
  if (Number.isNaN(expiresAtMs) || expiresAtMs < Date.now()) return null;
  return { reference: payloadReference, expiresAtMs };
}

/** Verifies the applicant-access cookie grants access to the given reference. Throws 401/403 otherwise. */
export async function assertApplicantAccess(request: Request, reference: string): Promise<void> {
  const access = await readApplicantAccessCookie(request);
  if (!access) throw new UnauthorizedError("يجب تأكيد الوصول لمتابعة الطلب");
  if (access.reference !== reference) throw new ForbiddenError("لا يمكن الوصول إلى طلب غير طلبك");
}

/** Returns the reference embedded in the current verified applicant-access cookie, or throws 401 if absent/invalid. */
export async function requireApplicantAccessReference(request: Request): Promise<string> {
  const access = await readApplicantAccessCookie(request);
  if (!access) throw new UnauthorizedError("يجب تأكيد الوصول لمتابعة طلبك أولًا");
  return access.reference;
}

// ---------------------------------------------------------------------------
// Draft persistence (verified only)
// ---------------------------------------------------------------------------

export async function updateApplicationDraft(reference: string, input: MembershipApplicationDraftInput): Promise<void> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");
  if (!["draft", "requires_action"].includes(application.applicationStatus)) {
    throw new ConflictError("لا يمكن تعديل بيانات الطلب في هذه المرحلة");
  }

  const [profile] = await db.select().from(schema.membershipApplicationProfile).where(eq(schema.membershipApplicationProfile.applicationId, application.id)).limit(1);
  const now = nowIso();
  const mergedAnswers = { ...(profile ? JSON.parse(profile.answersJson) : {}), ...(input.answers ?? {}) };
  const mergedAddress = { ...(profile ? JSON.parse(profile.addressJson) : {}), ...(input.address ?? {}) };

  await db
    .update(schema.membershipApplicationProfile)
    .set({
      legalName: input.legalName ?? profile?.legalName ?? null,
      dateOfBirth: input.dateOfBirth ?? profile?.dateOfBirth ?? null,
      occupation: input.occupation ?? profile?.occupation ?? null,
      education: input.education ?? profile?.education ?? null,
      addressJson: JSON.stringify(mergedAddress),
      answersJson: JSON.stringify(mergedAnswers),
      updatedAt: now,
    })
    .where(eq(schema.membershipApplicationProfile.applicationId, application.id));
  await db.update(schema.membershipApplications).set({ updatedAt: now }).where(eq(schema.membershipApplications.id, application.id));
}

// ---------------------------------------------------------------------------
// Public-safe status view
// ---------------------------------------------------------------------------

export async function getApplicationStatusView(reference: string): Promise<MembershipApplicationStatusView> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");

  const history = await db
    .select()
    .from(schema.membershipStatusHistory)
    .where(eq(schema.membershipStatusHistory.applicationId, application.id))
    .orderBy(desc(schema.membershipStatusHistory.createdAt));

  const pendingActionRows = await db
    .select()
    .from(schema.membershipActionRequests)
    .where(and(eq(schema.membershipActionRequests.applicationId, application.id)));
  const pendingActions = pendingActionRows
    .filter((a) => !a.resolvedAt)
    .map((a) => ({ id: a.id, publicInstructions: a.publicInstructions, requestedFields: JSON.parse(a.requestedFieldsJson) as string[], dueDate: a.dueDate }));

  const recommendedBranch = application.recommendedBranchId ? await getBranchById(application.recommendedBranchId).catch(() => null) : null;
  const currentFee = await getCurrentFeeRule();

  return {
    reference: application.publicReference,
    status: application.applicationStatus as MembershipApplicationStatusView["status"],
    publicTimeline: history
      .filter((h) => h.publicMessage)
      .map((h) => ({ status: h.status as MembershipApplicationStatusView["status"], publicMessage: h.publicMessage, createdAt: h.createdAt })),
    pendingActions,
    recommendedBranch: recommendedBranch
      ? {
          id: recommendedBranch.id,
          slug: recommendedBranch.slug,
          governorate: recommendedBranch.governorate,
          nameAr: recommendedBranch.nameAr,
          nameEn: recommendedBranch.nameEn,
          addressAr: recommendedBranch.addressAr,
          addressEn: recommendedBranch.addressEn,
          lat: recommendedBranch.lat,
          lng: recommendedBranch.lng,
          contacts: JSON.parse(recommendedBranch.contactsJson),
          officeHours: JSON.parse(recommendedBranch.officeHoursJson),
          completionServices: JSON.parse(recommendedBranch.completionServicesJson),
        }
      : null,
    currentFee,
  };
}

// ---------------------------------------------------------------------------
// Applicant completes a staff-requested action
// ---------------------------------------------------------------------------

export async function completeApplicationAction(reference: string, actionRequestId: number, input: MembershipActionCompleteInput): Promise<void> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");

  const [actionRequest] = await db
    .select()
    .from(schema.membershipActionRequests)
    .where(and(eq(schema.membershipActionRequests.id, actionRequestId), eq(schema.membershipActionRequests.applicationId, application.id)))
    .limit(1);
  if (!actionRequest) throw new NotFoundError("الإجراء المطلوب غير موجود");
  if (actionRequest.resolvedAt) throw new ConflictError("تم تنفيذ هذا الإجراء مسبقًا");

  const now = nowIso();
  await db.update(schema.membershipActionRequests).set({ resolvedAt: now }).where(eq(schema.membershipActionRequests.id, actionRequestId));

  if (input.answers && Object.keys(input.answers).length) {
    const [profile] = await db.select().from(schema.membershipApplicationProfile).where(eq(schema.membershipApplicationProfile.applicationId, application.id)).limit(1);
    const merged = { ...(profile ? JSON.parse(profile.answersJson) : {}), ...input.answers };
    await db.update(schema.membershipApplicationProfile).set({ answersJson: JSON.stringify(merged), updatedAt: now }).where(eq(schema.membershipApplicationProfile.applicationId, application.id));
  }
  for (const assetId of input.supportingDocumentAssetIds ?? []) {
    await db.insert(schema.membershipApplicationFiles).values({ applicationId: application.id, storageAssetId: assetId, fileType: "supporting_document", verificationStatus: "pending", createdAt: now });
  }

  const stillOpen = await db
    .select()
    .from(schema.membershipActionRequests)
    .where(and(eq(schema.membershipActionRequests.applicationId, application.id)));
  const hasOtherOpen = stillOpen.some((a) => a.id !== actionRequestId && !a.resolvedAt);

  if (!hasOtherOpen && application.applicationStatus === "requires_action") {
    await db.update(schema.membershipApplications).set({ applicationStatus: "submitted", updatedAt: now }).where(eq(schema.membershipApplications.id, application.id));
    await db.insert(schema.membershipStatusHistory).values({ applicationId: application.id, status: "submitted", publicMessage: "تم استكمال البيانات المطلوبة، الطلب قيد المراجعة مرة أخرى.", createdAt: now });
  }
}

// ---------------------------------------------------------------------------
// Admin review and decision state machine
// ---------------------------------------------------------------------------

export async function listAdminMembershipApplications(status?: string) {
  const db = getDb();
  const rows = await db
    .select({ application: schema.membershipApplications, contact: schema.contacts })
    .from(schema.membershipApplications)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.membershipApplications.contactId))
    .where(status ? eq(schema.membershipApplications.applicationStatus, status) : undefined)
    .orderBy(desc(schema.membershipApplications.id))
    .limit(100);
  return rows;
}

export async function getAdminMembershipApplicationDetail(id: number) {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.id, id)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, application.contactId)).limit(1);
  const [profile] = await db.select().from(schema.membershipApplicationProfile).where(eq(schema.membershipApplicationProfile.applicationId, id)).limit(1);
  const files = await db.select().from(schema.membershipApplicationFiles).where(eq(schema.membershipApplicationFiles.applicationId, id));
  const history = await db.select().from(schema.membershipStatusHistory).where(eq(schema.membershipStatusHistory.applicationId, id)).orderBy(desc(schema.membershipStatusHistory.createdAt));
  const actionRequests = await db.select().from(schema.membershipActionRequests).where(eq(schema.membershipActionRequests.applicationId, id));
  return { application, contact, profile, files, history, actionRequests };
}

const transitionTable: Record<string, string[]> = {
  submitted: ["assign_reviewer", "request_action", "accept_in_principle", "reject"],
  under_review: ["request_action", "accept_in_principle", "reject"],
  requires_action: ["assign_reviewer"],
  branch_completion_pending: ["select_branch", "mark_fee_paid", "mark_fee_waived", "verify_documents", "book_appointment", "mark_attended", "complete"],
  fee_pending: ["mark_fee_paid", "mark_fee_waived", "complete"],
  documents_pending: ["verify_documents", "complete"],
  appointment_booked: ["mark_attended", "complete"],
  completed: ["issue_card"],
  active: ["suspend_membership", "revoke_membership"],
  suspended: ["revoke_membership"],
};

/** Runs one admin/branch-staff decision action, enforcing the state machine and writing audit + status history. */
export async function decideMembershipApplication(applicationId: number, input: AdminMembershipDecisionInput, actorId: number | null): Promise<void> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.id, applicationId)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");

  const allowed = transitionTable[application.applicationStatus] ?? [];
  if (!allowed.includes(input.action)) {
    throw new ConflictError(`لا يمكن تنفيذ "${input.action}" من حالة "${application.applicationStatus}"`);
  }

  const now = nowIso();
  let nextStatus: string | null = null;
  const patch: Partial<typeof schema.membershipApplications.$inferInsert> = { updatedAt: now };

  switch (input.action) {
    case "assign_reviewer":
      if (!input.reviewerId) throw new ValidationError({ reviewerId: ["مطلوب مراجع"] });
      patch.reviewOwnerId = input.reviewerId;
      nextStatus = "under_review";
      patch.reviewedAt = now;
      break;
    case "request_action": {
      if (!input.publicInstructions) throw new ValidationError({ publicInstructions: ["التعليمات العامة مطلوبة"] });
      await db.insert(schema.membershipActionRequests).values({
        applicationId,
        requestedFieldsJson: JSON.stringify(input.requestedFields ?? []),
        publicInstructions: input.publicInstructions,
        dueDate: input.dueDate ?? null,
        createdAt: now,
      });
      nextStatus = "requires_action";
      break;
    }
    case "accept_in_principle":
      nextStatus = "branch_completion_pending";
      patch.decisionAt = now;
      if (input.branchId) patch.recommendedBranchId = input.branchId;
      break;
    case "reject":
      nextStatus = "rejected";
      patch.decisionAt = now;
      break;
    case "select_branch":
      if (!input.branchId) throw new ValidationError({ branchId: ["الفرع مطلوب"] });
      patch.recommendedBranchId = input.branchId;
      break;
    case "mark_fee_paid":
      patch.paymentStatus = "paid";
      nextStatus = await nextAfterCompletionStep(db, applicationId, "fee");
      break;
    case "mark_fee_waived":
      patch.paymentStatus = "waived";
      nextStatus = await nextAfterCompletionStep(db, applicationId, "fee");
      break;
    case "verify_documents":
      await db.update(schema.membershipApplicationFiles).set({ verificationStatus: "verified" }).where(eq(schema.membershipApplicationFiles.applicationId, applicationId));
      nextStatus = await nextAfterCompletionStep(db, applicationId, "documents");
      break;
    case "book_appointment": {
      if (!input.branchId || !input.scheduledAt) throw new ValidationError({ scheduledAt: ["الفرع والموعد مطلوبان"] });
      await db.insert(schema.membershipCompletionAppointments).values({ applicationId, branchId: input.branchId, scheduledAt: input.scheduledAt, status: "confirmed", createdAt: now, updatedAt: now });
      nextStatus = "appointment_booked";
      break;
    }
    case "mark_attended":
      await db
        .update(schema.membershipCompletionAppointments)
        .set({ status: "attended", attendance: "attended", updatedAt: now })
        .where(eq(schema.membershipCompletionAppointments.applicationId, applicationId));
      nextStatus = await nextAfterCompletionStep(db, applicationId, "appointment");
      break;
    case "complete":
      patch.completionStatus = "completed";
      nextStatus = "completed";
      break;
    case "issue_card":
      await issueMembershipCard(applicationId, actorId);
      nextStatus = "active";
      break;
    case "suspend_membership":
      await db.update(schema.memberships).set({ status: "suspended" }).where(eq(schema.memberships.applicationId, applicationId));
      nextStatus = "suspended";
      break;
    case "revoke_membership":
      await db.update(schema.memberships).set({ status: "revoked" }).where(eq(schema.memberships.applicationId, applicationId));
      await db
        .update(schema.membershipCards)
        .set({ revokedAt: now, shareEnabled: 0 })
        .where(eq(schema.membershipCards.membershipId, (await db.select().from(schema.memberships).where(eq(schema.memberships.applicationId, applicationId)).limit(1))[0]?.id ?? -1));
      nextStatus = "revoked";
      break;
  }

  if (nextStatus) patch.applicationStatus = nextStatus;
  await db.update(schema.membershipApplications).set(patch).where(eq(schema.membershipApplications.id, applicationId));

  if (nextStatus) {
    await db.insert(schema.membershipStatusHistory).values({
      applicationId,
      status: nextStatus,
      publicMessage: input.publicMessage ?? null,
      internalNote: input.note ?? null,
      actorUserId: actorId,
      createdAt: now,
    });
  }

  await recordAuditLog({ actorUserId: actorId, action: `membership.${input.action}`, entityType: "membership_applications", entityId: applicationId, before: { status: application.applicationStatus }, after: { action: input.action, nextStatus }, requestId: null });
}

/** Branch-completion sub-steps (fee/documents/appointment) only advance to `completed` once all configured requirements for the application are satisfied. Simplified here: moves to the next pending step name, or `completed` once no step objection remains — actual completion is finalized via the explicit `complete` action by staff. */
async function nextAfterCompletionStep(_db: ReturnType<typeof getDb>, _applicationId: number, _step: "fee" | "documents" | "appointment"): Promise<string> {
  // Keep the application in `branch_completion_pending` after any individual sub-step —
  // staff explicitly calls `complete` once all required steps are satisfied, matching the
  // brief's "only completion can issue membership" rule.
  return "branch_completion_pending";
}

/** Creates the `memberships` row + membership number + initial card record once an application is marked `completed`. */
async function issueMembershipCard(applicationId: number, actorId: number | null): Promise<void> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.id, applicationId)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");
  if (application.applicationStatus !== "completed") throw new ConflictError("لا يمكن إصدار العضوية قبل اكتمال كل الخطوات");
  if (!application.recommendedBranchId) throw new ConflictError("لا يوجد فرع محدد لإصدار العضوية");

  const now = nowIso();
  // Non-sequential, non-guessable membership number.
  const membershipNumber = generateReference("MEM").replace("-", "");

  const membershipInserted = await db
    .insert(schema.memberships)
    .values({ applicationId, membershipNumber, status: "active", issuedAt: now, branchId: application.recommendedBranchId, completedAt: now })
    .returning({ id: schema.memberships.id });

  const [activeTemplate] = await db.select().from(schema.membershipCardTemplates).where(eq(schema.membershipCardTemplates.active, 1)).limit(1);

  await db.insert(schema.membershipCards).values({
    membershipId: membershipInserted[0].id,
    templateVersion: activeTemplate?.version ?? 1,
    renderAssetId: null,
    shareEnabled: 0,
    issuedAt: now,
  });

  await recordAuditLog({ actorUserId: actorId, action: "membership.card.issue", entityType: "memberships", entityId: membershipInserted[0].id, requestId: null });
}
