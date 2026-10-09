import { asc, desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import { recordAuditLog } from "@/server/services/audit-service";

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export async function listPublicPartners() {
  const db = getDb();
  return db.select().from(schema.partners).where(eq(schema.partners.status, "published")).orderBy(desc(schema.partners.id));
}

export async function listAdminPartners() {
  const db = getDb();
  return db.select().from(schema.partners).orderBy(desc(schema.partners.id));
}

export async function createPartner(input: Omit<typeof schema.partners.$inferInsert, "id" | "createdAt" | "updatedAt">, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const inserted = await db.insert(schema.partners).values({ ...input, createdAt: now, updatedAt: now }).returning({ id: schema.partners.id });
  await recordAuditLog({ actorUserId: actorId, action: "partners.create", entityType: "partners", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

export async function updatePartner(id: number, patch: Partial<typeof schema.partners.$inferInsert>, actorId: number | null) {
  const db = getDb();
  const [existing] = await db.select().from(schema.partners).where(eq(schema.partners.id, id)).limit(1);
  if (!existing) throw new NotFoundError("الشريك غير موجود");
  await db.update(schema.partners).set({ ...patch, updatedAt: nowIso() }).where(eq(schema.partners.id, id));
  await recordAuditLog({ actorUserId: actorId, action: "partners.update", entityType: "partners", entityId: id, before: existing, after: patch, requestId: null });
}

// ---------------------------------------------------------------------------
// Team members
// ---------------------------------------------------------------------------

export async function listPublicTeamMembers() {
  const db = getDb();
  return db.select().from(schema.teamMembers).where(eq(schema.teamMembers.status, "published")).orderBy(asc(schema.teamMembers.sortOrder));
}

export async function listAdminTeamMembers() {
  const db = getDb();
  return db.select().from(schema.teamMembers).orderBy(asc(schema.teamMembers.sortOrder));
}

export async function createTeamMember(input: Omit<typeof schema.teamMembers.$inferInsert, "id" | "createdAt" | "updatedAt">, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const inserted = await db.insert(schema.teamMembers).values({ ...input, createdAt: now, updatedAt: now }).returning({ id: schema.teamMembers.id });
  await recordAuditLog({ actorUserId: actorId, action: "team.create", entityType: "team_members", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

export async function updateTeamMember(id: number, patch: Partial<typeof schema.teamMembers.$inferInsert>, actorId: number | null) {
  const db = getDb();
  const [existing] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, id)).limit(1);
  if (!existing) throw new NotFoundError("عضو الفريق غير موجود");
  await db.update(schema.teamMembers).set({ ...patch, updatedAt: nowIso() }).where(eq(schema.teamMembers.id, id));
  await recordAuditLog({ actorUserId: actorId, action: "team.update", entityType: "team_members", entityId: id, before: existing, after: patch, requestId: null });
}

// ---------------------------------------------------------------------------
// Governorate profiles
// ---------------------------------------------------------------------------

export async function listPublicGovernorates() {
  const db = getDb();
  return db.select().from(schema.governorateProfiles).where(eq(schema.governorateProfiles.status, "published")).orderBy(asc(schema.governorateProfiles.governorate));
}

export async function listAdminGovernorates() {
  const db = getDb();
  return db.select().from(schema.governorateProfiles).orderBy(asc(schema.governorateProfiles.governorate));
}

export async function upsertGovernorate(input: Omit<typeof schema.governorateProfiles.$inferInsert, "id" | "createdAt" | "updatedAt">, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const [existing] = await db.select().from(schema.governorateProfiles).where(eq(schema.governorateProfiles.governorate, input.governorate)).limit(1);
  if (existing) {
    await db.update(schema.governorateProfiles).set({ ...input, updatedAt: now }).where(eq(schema.governorateProfiles.id, existing.id));
    await recordAuditLog({ actorUserId: actorId, action: "governorates.update", entityType: "governorate_profiles", entityId: existing.id, before: existing, after: input, requestId: null });
    return existing.id;
  }
  const inserted = await db.insert(schema.governorateProfiles).values({ ...input, createdAt: now, updatedAt: now }).returning({ id: schema.governorateProfiles.id });
  await recordAuditLog({ actorUserId: actorId, action: "governorates.create", entityType: "governorate_profiles", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

// ---------------------------------------------------------------------------
// Organization structure
// ---------------------------------------------------------------------------

export async function getOrganizationStructure() {
  const db = getDb();
  const nodes = await db.select().from(schema.organizationStructureNodes).orderBy(asc(schema.organizationStructureNodes.sortOrder));
  const byParent = new Map<number | null, typeof nodes>();
  for (const node of nodes) {
    const key = node.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }
  function build(parentId: number | null): unknown[] {
    return (byParent.get(parentId) ?? []).map((node) => ({ ...node, children: build(node.id) }));
  }
  return build(null);
}

// ---------------------------------------------------------------------------
// Program & opportunity typed details (joined onto content_entries)
// ---------------------------------------------------------------------------

export async function getProgramDetailsByEntryId(entryId: number) {
  const db = getDb();
  const [row] = await db.select().from(schema.programDetails).where(eq(schema.programDetails.contentEntryId, entryId)).limit(1);
  return row ?? null;
}

export async function getOpportunityDetailsByEntryId(entryId: number) {
  const db = getDb();
  const [row] = await db.select().from(schema.opportunityDetails).where(eq(schema.opportunityDetails.contentEntryId, entryId)).limit(1);
  return row ?? null;
}

export async function upsertProgramDetails(input: Omit<typeof schema.programDetails.$inferInsert, "id" | "createdAt" | "updatedAt">, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const [existing] = await db.select().from(schema.programDetails).where(eq(schema.programDetails.contentEntryId, input.contentEntryId)).limit(1);
  if (existing) {
    await db.update(schema.programDetails).set({ ...input, updatedAt: now }).where(eq(schema.programDetails.id, existing.id));
    await recordAuditLog({ actorUserId: actorId, action: "programs.update_details", entityType: "program_details", entityId: existing.id, after: input, requestId: null });
    return existing.id;
  }
  const inserted = await db.insert(schema.programDetails).values({ ...input, createdAt: now, updatedAt: now }).returning({ id: schema.programDetails.id });
  await recordAuditLog({ actorUserId: actorId, action: "programs.create_details", entityType: "program_details", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}

export async function upsertOpportunityDetails(input: Omit<typeof schema.opportunityDetails.$inferInsert, "id" | "createdAt" | "updatedAt">, actorId: number | null) {
  const db = getDb();
  const now = nowIso();
  const [existing] = await db.select().from(schema.opportunityDetails).where(eq(schema.opportunityDetails.contentEntryId, input.contentEntryId)).limit(1);
  if (existing) {
    await db.update(schema.opportunityDetails).set({ ...input, updatedAt: now }).where(eq(schema.opportunityDetails.id, existing.id));
    await recordAuditLog({ actorUserId: actorId, action: "opportunities.update_details", entityType: "opportunity_details", entityId: existing.id, after: input, requestId: null });
    return existing.id;
  }
  const inserted = await db.insert(schema.opportunityDetails).values({ ...input, createdAt: now, updatedAt: now }).returning({ id: schema.opportunityDetails.id });
  await recordAuditLog({ actorUserId: actorId, action: "opportunities.create_details", entityType: "opportunity_details", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
