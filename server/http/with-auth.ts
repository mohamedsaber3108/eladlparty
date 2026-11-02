import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { requirePermission } from "@/server/policies/rbac";
import { UnauthorizedError } from "@/server/http/errors";
import { defaultRolePermissions, type PermissionKey, type RoleKey, type SessionUser } from "@/shared/contracts/auth";

/**
 * Resolves the current Auth.js session (if any) into a `SessionUser` with live RBAC
 * roles/permissions. Auth.js's own `auth_users` table only proves *who* signed in (an email
 * address); this function maps that email to the domain `users` table — the thing every
 * `content_entries.authorId`, `audit_logs.actorUserId`, etc. FK column actually points at —
 * and resolves fresh roles/permissions on every call (not cached on the Auth.js session row),
 * exactly mirroring the behavior the old cookie-based `getSessionUser` had.
 */
export async function getStaffSession(): Promise<SessionUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
  if (!user || user.status !== "active") return null;

  const roleRows = await db
    .select({ key: schema.roles.key })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, user.id));
  const roleKeys = roleRows.map((r) => r.key as RoleKey);

  const permissionSet = new Set<PermissionKey>();
  for (const roleKey of roleKeys) {
    for (const permission of defaultRolePermissions[roleKey] ?? []) permissionSet.add(permission);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: roleKeys,
    permissions: Array.from(permissionSet),
  };
}

/**
 * Resolves the current staff session and asserts it carries `permission`. The `request`
 * parameter is accepted (and unused) only to preserve the call signature every admin API
 * route already uses — Auth.js's `auth()` reads the session cookie via Next's request-scoped
 * `cookies()`/`headers()`, not from an explicit `Request` object.
 */
export async function requireStaff(_request: Request, permission: PermissionKey): Promise<SessionUser> {
  const user = await getStaffSession();
  return requirePermission(user, permission);
}

/** Resolves the current staff session without a specific permission requirement (401 if absent). */
export async function requireAnySession(_request: Request): Promise<SessionUser> {
  const user = await getStaffSession();
  if (!user) throw new UnauthorizedError();
  return user;
}
