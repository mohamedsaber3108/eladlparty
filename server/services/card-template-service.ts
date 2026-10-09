import { desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import type { AdminCardTemplateUpsertInput } from "@/shared/contracts/membership";
import { recordAuditLog } from "@/server/services/audit-service";

export async function listCardTemplates() {
  const db = getDb();
  return db.select().from(schema.membershipCardTemplates).orderBy(desc(schema.membershipCardTemplates.id));
}

/** Creates a new versioned template. If `active`, deactivates every other template first (only one active at a time). */
export async function createCardTemplate(input: AdminCardTemplateUpsertInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const now = nowIso();

  const existingVersions = await db.select({ version: schema.membershipCardTemplates.version }).from(schema.membershipCardTemplates).where(eq(schema.membershipCardTemplates.name, input.name));
  const nextVersion = (existingVersions.reduce((max, r) => Math.max(max, r.version), 0) || 0) + 1;

  if (input.active) {
    await db.update(schema.membershipCardTemplates).set({ active: 0 }).where(eq(schema.membershipCardTemplates.active, 1));
  }

  const inserted = await db
    .insert(schema.membershipCardTemplates)
    .values({
      name: input.name,
      version: nextVersion,
      layoutConfigJson: JSON.stringify(input.layoutConfig),
      allowedPublicFieldsJson: JSON.stringify(input.allowedPublicFields),
      locale: input.locale,
      active: input.active ? 1 : 0,
      createdAt: now,
    })
    .returning({ id: schema.membershipCardTemplates.id });

  await recordAuditLog({ actorUserId: actorId, action: "card_template.create", entityType: "membership_card_templates", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
