import { eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/http/errors";
import { randomToken, sha256Hex } from "@/server/security/crypto";
import { recordAuditLog } from "@/server/services/audit-service";
import { getBranchById } from "@/server/services/branch-service";
import type { MembershipCardDto, PublicShareCard } from "@/shared/contracts/membership";

/** Returns the current member's card by application reference. Caller must have already verified applicant access. */
export async function getCurrentMembershipCard(reference: string): Promise<MembershipCardDto> {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.applicationId, application.id)).limit(1);
  if (!membership) throw new NotFoundError("لا توجد عضوية مرتبطة بهذا الطلب بعد");

  const [card] = await db.select().from(schema.membershipCards).where(eq(schema.membershipCards.membershipId, membership.id)).limit(1);
  const branch = await getBranchById(membership.branchId);

  return {
    membershipNumber: membership.membershipNumber,
    status: membership.status as MembershipCardDto["status"],
    issuedAt: membership.issuedAt,
    expiresAt: membership.expiresAt,
    branchName: branch.nameAr,
    renderAssetUrl: card?.renderAssetId ? `/media/card-${card.renderAssetId}` : null,
    shareEnabled: card?.shareEnabled === 1,
  };
}

async function getOwnCardOrThrow(reference: string, cardId: number) {
  const db = getDb();
  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.publicReference, reference)).limit(1);
  if (!application) throw new NotFoundError("الطلب غير موجود");
  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.applicationId, application.id)).limit(1);
  if (!membership || membership.status !== "active") throw new ConflictError("لا يمكن مشاركة بطاقة عضوية غير فعّالة");
  const [card] = await db.select().from(schema.membershipCards).where(eq(schema.membershipCards.membershipId, membership.id)).limit(1);
  if (!card || card.id !== cardId) throw new ForbiddenError("لا يمكن الوصول إلى بطاقة غير بطاقتك");
  return card;
}

/** Creates (or rotates) a revocable high-entropy share link for an active member's own card. */
export async function createShareLink(reference: string, cardId: number, actorId: number | null): Promise<string> {
  const db = getDb();
  const card = await getOwnCardOrThrow(reference, cardId);

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  await db.update(schema.membershipCards).set({ publicShareTokenHash: tokenHash, shareEnabled: 1 }).where(eq(schema.membershipCards.id, card.id));
  await recordAuditLog({ actorUserId: actorId, action: "membership.card.share_create", entityType: "membership_cards", entityId: card.id, requestId: null });
  return token;
}

export async function revokeShareLink(reference: string, cardId: number, actorId: number | null): Promise<void> {
  const db = getDb();
  const card = await getOwnCardOrThrow(reference, cardId);
  await db.update(schema.membershipCards).set({ publicShareTokenHash: null, shareEnabled: 0 }).where(eq(schema.membershipCards.id, card.id));
  await recordAuditLog({ actorUserId: actorId, action: "membership.card.share_revoke", entityType: "membership_cards", entityId: card.id, requestId: null });
}

/** Public share-card lookup by token. Only returns template-allow-listed fields; immediately fails if revoked. */
export async function getPublicShareCard(token: string): Promise<PublicShareCard> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const [card] = await db
    .select()
    .from(schema.membershipCards)
    .where(eq(schema.membershipCards.publicShareTokenHash, tokenHash))
    .limit(1);
  if (!card || card.shareEnabled !== 1 || card.revokedAt) throw new ForbiddenError("رابط المشاركة غير صالح أو تم إلغاؤه");

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, card.membershipId)).limit(1);
  if (!membership || membership.status !== "active") throw new ForbiddenError("العضوية غير فعّالة");

  const [application] = await db.select().from(schema.membershipApplications).where(eq(schema.membershipApplications.id, membership.applicationId)).limit(1);
  const [contact] = application ? await db.select().from(schema.contacts).where(eq(schema.contacts.id, application.contactId)).limit(1) : [null];
  const branch = await getBranchById(membership.branchId);

  await db.insert(schema.membershipShareEvents).values({ membershipCardId: card.id, channel: "link", createdAt: nowIso() });

  return {
    memberDisplayName: contact?.name ?? "عضو حزب العدل",
    membershipStatus: "active",
    branchName: branch.nameAr,
    issuedYear: membership.issuedAt.slice(0, 4),
  };
}
