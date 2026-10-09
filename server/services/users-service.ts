import { desc, eq, inArray } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/server/http/errors";
import type { AdminUserUpsertInput } from "@/shared/contracts/admin";
import { assertCanManageTarget } from "@/server/policies/rbac";
import type { SessionUser } from "@/shared/contracts/auth";
import { recordAuditLog } from "@/server/services/audit-service";

export async function listStaffUsers() {
  const db = getDb();
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.id));
  const roleRows = await db
    .select({ userId: schema.userRoles.userId, roleKey: schema.roles.key })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId));

  const rolesByUser = new Map<number, string[]>();
  for (const row of roleRows) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push(row.roleKey);
    rolesByUser.set(row.userId, list);
  }

  return users.map((u) => ({ ...u, roles: rolesByUser.get(u.id) ?? [] }));
}

/** Creates or updates a staff user's roles. Protects super_admin accounts from non-super_admin actors. */
export async function upsertStaffUser(input: AdminUserUpsertInput, actor: SessionUser): Promise<number> {
  const db = getDb();
  const now = nowIso();

  const roleRows = await db.select().from(schema.roles).where(inArray(schema.roles.key, input.roleKeys));
  if (roleRows.length !== input.roleKeys.length) {
    throw new ValidationError({ roleKeys: ["دور واحد أو أكثر غير معروف"] });
  }

  assertCanManageTarget(actor, input.roleKeys);

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, input.email.toLowerCase())).limit(1);
  let userId: number;

  if (existing) {
    const existingRoleRows = await db
      .select({ roleKey: schema.roles.key })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.userRoles.userId, existing.id));
    assertCanManageTarget(actor, existingRoleRows.map((r) => r.roleKey));
    userId = existing.id;
    await db.update(schema.users).set({ displayName: input.displayName ?? existing.displayName, updatedAt: now }).where(eq(schema.users.id, userId));
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
  } else {
    const inserted = await db
      .insert(schema.users)
      .values({ email: input.email.toLowerCase(), displayName: input.displayName ?? null, status: "invited", createdAt: now, updatedAt: now })
      .returning({ id: schema.users.id });
    userId = inserted[0].id;
  }

  for (const role of roleRows) {
    await db.insert(schema.userRoles).values({ userId, roleId: role.id, assignedAt: now }).onConflictDoNothing();
  }

  await recordAuditLog({ actorUserId: actor.id, action: existing ? "users.update" : "users.invite", entityType: "users", entityId: userId, after: input, requestId: null });
  return userId;
}

export async function suspendStaffUser(userId: number, actor: SessionUser): Promise<void> {
  const db = getDb();
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!target) throw new NotFoundError("المستخدم غير موجود");
  if (target.id === actor.id) throw new ConflictError("لا يمكنك تعليق حسابك الخاص");

  const roleRows = await db
    .select({ roleKey: schema.roles.key })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, userId));
  assertCanManageTarget(actor, roleRows.map((r) => r.roleKey));

  await db.update(schema.users).set({ status: "suspended", updatedAt: nowIso() }).where(eq(schema.users.id, userId));
  await db.update(schema.sessions).set({ revokedAt: nowIso() }).where(eq(schema.sessions.userId, userId));
  await recordAuditLog({ actorUserId: actor.id, action: "users.suspend", entityType: "users", entityId: userId, requestId: null });
}

export async function listRoles() {
  const db = getDb();
  return db.select().from(schema.roles).orderBy(schema.roles.id);
}
