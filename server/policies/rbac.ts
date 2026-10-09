import type { PermissionKey, SessionUser } from "@/shared/contracts/auth";
import { ForbiddenError, UnauthorizedError } from "@/server/http/errors";

export function hasPermission(user: SessionUser | null, permission: PermissionKey): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/** Throws 401 if there is no session, 403 if the session lacks the permission. */
export function requirePermission(user: SessionUser | null, permission: PermissionKey): SessionUser {
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user, permission)) throw new ForbiddenError(`الصلاحية المطلوبة غير متاحة: ${permission}`);
  return user;
}

/** Throws 401 if there is no session at all (any authenticated staff member). */
export function requireAnyStaff(user: SessionUser | null): SessionUser {
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Prevents a non-super_admin from mutating a super_admin's roles/status (self-lockout protection). */
export function assertCanManageTarget(actor: SessionUser, targetRoles: string[]): void {
  if (targetRoles.includes("super_admin") && !actor.roles.includes("super_admin")) {
    throw new ForbiddenError("لا يمكن تعديل حساب مدير عام إلا من مدير عام آخر");
  }
}
