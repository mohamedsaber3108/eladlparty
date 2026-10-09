import { and, asc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import type { AdminBranchUpsertInput, PublicBranch } from "@/shared/contracts/membership";
import { recordAuditLog } from "@/server/services/audit-service";

function toPublicBranch(row: typeof schema.partyBranches.$inferSelect): PublicBranch {
  return {
    id: row.id,
    slug: row.slug,
    governorate: row.governorate,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    addressAr: row.addressAr,
    addressEn: row.addressEn,
    lat: row.lat,
    lng: row.lng,
    contacts: JSON.parse(row.contactsJson) as Record<string, unknown>,
    officeHours: JSON.parse(row.officeHoursJson) as Record<string, unknown>,
    completionServices: JSON.parse(row.completionServicesJson) as string[],
  };
}

export async function listPublicBranches(): Promise<PublicBranch[]> {
  const db = getDb();
  const rows = await db.select().from(schema.partyBranches).where(eq(schema.partyBranches.active, 1)).orderBy(asc(schema.partyBranches.governorate));
  return rows.map(toPublicBranch);
}

export async function getPublicBranchBySlug(slug: string): Promise<PublicBranch> {
  const db = getDb();
  const [row] = await db.select().from(schema.partyBranches).where(and(eq(schema.partyBranches.slug, slug), eq(schema.partyBranches.active, 1))).limit(1);
  if (!row) throw new NotFoundError("الفرع غير متاح");
  return toPublicBranch(row);
}

export async function getBranchById(id: number) {
  const db = getDb();
  const [row] = await db.select().from(schema.partyBranches).where(eq(schema.partyBranches.id, id)).limit(1);
  if (!row) throw new NotFoundError("الفرع غير موجود");
  return row;
}

export async function listAdminBranches() {
  const db = getDb();
  return db.select().from(schema.partyBranches).orderBy(asc(schema.partyBranches.governorate));
}

export async function upsertBranch(input: AdminBranchUpsertInput, actorId: number | null): Promise<number> {
  const db = getDb();
  const now = nowIso();
  const [existing] = await db.select().from(schema.partyBranches).where(eq(schema.partyBranches.slug, input.slug)).limit(1);

  const values = {
    governorate: input.governorate,
    slug: input.slug,
    nameAr: input.nameAr,
    nameEn: input.nameEn ?? null,
    addressAr: input.addressAr ?? null,
    addressEn: input.addressEn ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    contactsJson: JSON.stringify(input.contacts ?? {}),
    officeHoursJson: JSON.stringify(input.officeHours ?? {}),
    completionServicesJson: JSON.stringify(input.completionServices ?? []),
    active: input.active ? 1 : 0,
    updatedAt: now,
  };

  if (existing) {
    await db.update(schema.partyBranches).set(values).where(eq(schema.partyBranches.id, existing.id));
    await recordAuditLog({ actorUserId: actorId, action: "branch.update", entityType: "party_branches", entityId: existing.id, before: existing, after: input, requestId: null });
    return existing.id;
  }

  const inserted = await db.insert(schema.partyBranches).values({ ...values, createdAt: now }).returning({ id: schema.partyBranches.id });
  await recordAuditLog({ actorUserId: actorId, action: "branch.create", entityType: "party_branches", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
