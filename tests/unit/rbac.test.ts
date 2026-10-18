import { describe, expect, it } from "vitest";
import { assertCanManageTarget, hasPermission, requireAnyStaff, requirePermission } from "@/server/policies/rbac";
import { ForbiddenError, UnauthorizedError } from "@/server/http/errors";
import type { SessionUser } from "@/shared/contracts/auth";

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 1,
    email: "staff@example.org",
    displayName: "Staff",
    roles: ["editor"],
    permissions: ["content.create", "content.update"],
    ...overrides,
  };
}

describe("hasPermission", () => {
  it("returns false for a null session", () => {
    expect(hasPermission(null, "content.create")).toBe(false);
  });

  it("returns true when the permission is in the session's permission list", () => {
    expect(hasPermission(user(), "content.create")).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    expect(hasPermission(user(), "content.publish")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws UnauthorizedError (401) when there is no session", () => {
    expect(() => requirePermission(null, "content.create")).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError (403) when the session lacks the permission", () => {
    expect(() => requirePermission(user(), "users.manage")).toThrow(ForbiddenError);
  });

  it("returns the session user when the permission is present", () => {
    const u = user();
    expect(requirePermission(u, "content.create")).toBe(u);
  });
});

describe("requireAnyStaff", () => {
  it("throws UnauthorizedError when there is no session", () => {
    expect(() => requireAnyStaff(null)).toThrow(UnauthorizedError);
  });

  it("returns the session user for any authenticated staff member regardless of permissions", () => {
    const u = user({ permissions: [] });
    expect(requireAnyStaff(u)).toBe(u);
  });
});

describe("assertCanManageTarget", () => {
  it("allows a super_admin actor to manage a super_admin target", () => {
    const actor = user({ roles: ["super_admin"] });
    expect(() => assertCanManageTarget(actor, ["super_admin"])).not.toThrow();
  });

  it("blocks a non-super_admin actor from managing a super_admin target", () => {
    const actor = user({ roles: ["admin"] });
    expect(() => assertCanManageTarget(actor, ["super_admin"])).toThrow(ForbiddenError);
  });

  it("allows any staff actor to manage a non-super_admin target", () => {
    const actor = user({ roles: ["editor"] });
    expect(() => assertCanManageTarget(actor, ["editor"])).not.toThrow();
  });
});
