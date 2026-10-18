import { describe, expect, it } from "vitest";
import { defaultRolePermissions, permissionKeySchema, roleKeySchema } from "@/shared/contracts/auth";

describe("defaultRolePermissions matrix", () => {
  it("has an entry for every role defined in roleKeySchema (no orphaned role)", () => {
    for (const role of roleKeySchema.options) {
      expect(defaultRolePermissions).toHaveProperty(role);
    }
  });

  it("only grants permission keys that exist in permissionKeySchema (no typos/stale keys)", () => {
    const validPermissions = new Set(permissionKeySchema.options);
    for (const [role, permissions] of Object.entries(defaultRolePermissions)) {
      for (const permission of permissions) {
        expect(validPermissions.has(permission), `${role} grants unknown permission "${permission}"`).toBe(true);
      }
    }
  });

  it("super_admin holds every defined permission (full system access)", () => {
    const granted = new Set(defaultRolePermissions.super_admin);
    for (const permission of permissionKeySchema.options) {
      expect(granted.has(permission), `super_admin is missing "${permission}"`).toBe(true);
    }
  });

  it("editor cannot publish content (must go through a reviewer)", () => {
    expect(defaultRolePermissions.editor).not.toContain("content.publish");
  });

  it("editor can create and update content", () => {
    expect(defaultRolePermissions.editor).toContain("content.create");
    expect(defaultRolePermissions.editor).toContain("content.update");
  });

  it("media_manager cannot manage users (scoped to media only)", () => {
    expect(defaultRolePermissions.media_manager).not.toContain("users.manage");
    expect(defaultRolePermissions.media_manager).toContain("media.upload");
  });

  it("viewer cannot mutate anything (read-only analytics access only)", () => {
    expect(defaultRolePermissions.viewer).toEqual(["analytics.view"]);
  });

  it("branch_staff can only complete membership steps, never decide or issue cards", () => {
    expect(defaultRolePermissions.branch_staff).toEqual(["membership.complete"]);
    expect(defaultRolePermissions.branch_staff).not.toContain("membership.decide");
    expect(defaultRolePermissions.branch_staff).not.toContain("membership.card.issue");
  });

  it("membership_officer can decide and issue cards (full membership pipeline control)", () => {
    expect(defaultRolePermissions.membership_officer).toContain("membership.decide");
    expect(defaultRolePermissions.membership_officer).toContain("membership.card.issue");
  });

  it("only super_admin can manage settings (admin is deliberately excluded, same as roles.manage)", () => {
    const rolesWithSettings = Object.entries(defaultRolePermissions)
      .filter(([, perms]) => perms.includes("settings.manage"))
      .map(([role]) => role);
    expect(rolesWithSettings).toEqual(["super_admin"]);
  });

  it("only super_admin can manage roles (admin cannot alter role definitions)", () => {
    const rolesWithRoleManagement = Object.entries(defaultRolePermissions)
      .filter(([, perms]) => perms.includes("roles.manage"))
      .map(([role]) => role);
    expect(rolesWithRoleManagement).toEqual(["super_admin"]);
  });
});
