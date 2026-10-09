import { and, desc, eq, lte } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import type { AdminFeeRuleCreateInput, PublicFeeRule } from "@/shared/contracts/membership";
import { recordAuditLog } from "@/server/services/audit-service";

/** Returns the single currently-effective fee rule, or null if none is configured yet. */
export async function getCurrentFeeRule(): Promise<PublicFeeRule | null> {
  const db = getDb();
  const now = nowIso();
  const rows = await db
    .select()
    .from(schema.membershipFeeRules)
    .where(and(eq(schema.membershipFeeRules.active, 1), lte(schema.membershipFeeRules.effectiveFrom, now)))
    .orderBy(desc(schema.membershipFeeRules.effectiveFrom));

  const current = rows.find((r) => !r.effectiveTo || r.effectiveTo > now);
  if (!current) return null;
  return { amount: current.amount, currency: current.currency, effectiveFrom: current.effectiveFrom };
}

export async function listAdminFeeRules() {
  const db = getDb();
  return db.select().from(schema.membershipFeeRules).orderBy(desc(schema.membershipFeeRules.effectiveFrom));
}

/**
 * Creates a new fee rule and closes out the previously-active one (immutable history —
 * never edits a past rule's amount, only its `effectiveTo` end date).
 */
export async function createFeeRule(input: AdminFeeRuleCreateInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const now = nowIso();

  const [previouslyActive] = await db
    .select()
    .from(schema.membershipFeeRules)
    .where(eq(schema.membershipFeeRules.active, 1))
    .orderBy(desc(schema.membershipFeeRules.effectiveFrom))
    .limit(1);

  if (previouslyActive && !previouslyActive.effectiveTo) {
    await db
      .update(schema.membershipFeeRules)
      .set({ effectiveTo: input.effectiveFrom, active: 0 })
      .where(eq(schema.membershipFeeRules.id, previouslyActive.id));
  }

  const inserted = await db
    .insert(schema.membershipFeeRules)
    .values({
      amount: input.amount,
      currency: input.currency,
      effectiveFrom: input.effectiveFrom,
      waiverRulesJson: JSON.stringify(input.waiverRules ?? {}),
      active: 1,
      setBy: actorId,
      createdAt: now,
    })
    .returning({ id: schema.membershipFeeRules.id });

  await recordAuditLog({ actorUserId: actorId, action: "fees.create_rule", entityType: "membership_fee_rules", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
