import { getSessionUser, assertCsrfValid } from "@/server/services/auth-service";
import { requirePermission } from "@/server/policies/rbac";
import { UnauthorizedError } from "@/server/http/errors";
import type { PermissionKey, SessionUser } from "@/shared/contracts/auth";

/**
 * Resolves the current staff session and asserts it carries `permission`. For any method other
 * than GET/HEAD, also enforces the CSRF double-submit check since the session is cookie-based.
 */
export async function requireStaff(request: Request, permission: PermissionKey): Promise<SessionUser> {
  const user = await getSessionUser(request);
  const checked = requirePermission(user, permission);
  if (request.method !== "GET" && request.method !== "HEAD") {
    assertCsrfValid(request);
  }
  return checked;
}

/** Resolves the current staff session without a specific permission requirement (401 if absent). */
export async function requireAnySession(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new UnauthorizedError();
  if (request.method !== "GET" && request.method !== "HEAD") {
    assertCsrfValid(request);
  }
  return user;
}
