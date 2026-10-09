import { z } from "zod";

export const roleKeySchema = z.enum([
  "super_admin",
  "admin",
  "editor",
  "reviewer",
  "program_manager",
  "observatory_analyst",
  "media_manager",
  "viewer",
  // Section 15 additive roles.
  "membership_officer",
  "branch_staff",
]);
export type RoleKey = z.infer<typeof roleKeySchema>;

/** Granular permission keys evaluated server-side on every mutation. */
export const permissionKeySchema = z.enum([
  "content.create",
  "content.update",
  "content.publish",
  "content.delete",
  "content.translate",
  "events.manage",
  "programs.manage",
  "opportunities.manage",
  "partners.manage",
  "observatory.manage",
  "submission.view",
  "submission.assign",
  "submission.update",
  "media.upload",
  "media.delete",
  "knowledge.manage",
  "users.manage",
  "roles.manage",
  "settings.manage",
  "audit.view",
  "analytics.view",
  // Section 15 additive permissions.
  "membership.review",
  "membership.decide",
  "membership.complete",
  "membership.card.issue",
  "membership.export",
  "branch.manage",
  "fees.manage",
  "card_template.manage",
  "monitoring.manage_sources",
  "monitoring.review",
  "discussion.moderate",
]);
export type PermissionKey = z.infer<typeof permissionKeySchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().email(),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

export const magicLinkVerifySchema = z.object({
  token: z.string().trim().min(16),
});
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;

export const sessionUserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  displayName: z.string().nullable(),
  roles: z.array(roleKeySchema),
  permissions: z.array(permissionKeySchema),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionMeResponseSchema = z.object({
  authenticated: z.boolean(),
  user: sessionUserSchema.nullable(),
});
export type SessionMeResponse = z.infer<typeof sessionMeResponseSchema>;

/** Default permission grants per role. Mirrors docs/AUTH_RBAC.md — keep both in sync. */
export const defaultRolePermissions: Record<RoleKey, PermissionKey[]> = {
  super_admin: [
    "content.create", "content.update", "content.publish", "content.delete", "content.translate",
    "events.manage", "programs.manage", "opportunities.manage", "partners.manage",
    "observatory.manage", "submission.view", "submission.assign", "submission.update",
    "media.upload", "media.delete", "knowledge.manage", "users.manage", "roles.manage",
    "settings.manage", "audit.view", "analytics.view",
    "membership.review", "membership.decide", "membership.complete", "membership.card.issue",
    "membership.export", "branch.manage", "fees.manage", "card_template.manage",
    "monitoring.manage_sources", "monitoring.review", "discussion.moderate",
  ],
  admin: [
    "content.create", "content.update", "content.publish", "content.delete", "content.translate",
    "events.manage", "programs.manage", "opportunities.manage", "partners.manage",
    "observatory.manage", "submission.view", "submission.assign", "submission.update",
    "media.upload", "media.delete", "knowledge.manage", "audit.view", "analytics.view",
    "membership.review", "membership.decide", "membership.complete", "membership.card.issue",
    "membership.export", "branch.manage", "fees.manage", "card_template.manage",
    "monitoring.manage_sources", "monitoring.review", "discussion.moderate",
  ],
  editor: ["content.create", "content.update", "content.translate"],
  reviewer: ["content.update", "content.publish", "submission.view", "submission.update", "knowledge.manage"],
  program_manager: [
    "programs.manage", "opportunities.manage", "events.manage", "partners.manage",
    "submission.view", "submission.update",
  ],
  observatory_analyst: ["observatory.manage", "analytics.view", "monitoring.review", "discussion.moderate"],
  media_manager: ["media.upload", "media.delete"],
  viewer: ["analytics.view"],
  // Section 15 additive roles: membership_officer reviews/decides/issues cards centrally;
  // branch_staff only completes the in-person branch steps (fee/documents/appointment),
  // and cannot decide/accept/reject applications or issue cards.
  membership_officer: [
    "membership.review", "membership.decide", "membership.complete", "membership.card.issue", "membership.export",
  ],
  branch_staff: ["membership.complete"],
};
