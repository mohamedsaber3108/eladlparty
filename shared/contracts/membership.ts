import { z } from "zod";
import { honeypotSchema, localeSchema } from "./common";

export const membershipApplicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "requires_action",
  "accepted_in_principle",
  "rejected",
  "branch_completion_pending",
  "fee_pending",
  "documents_pending",
  "appointment_booked",
  "completed",
  "card_issued",
  "active",
  "suspended",
  "expired",
  "revoked",
]);
export type MembershipApplicationStatus = z.infer<typeof membershipApplicationStatusSchema>;

/** Public fee display — no private eligibility data. */
export const publicFeeRuleSchema = z.object({
  amount: z.number().int(),
  currency: z.string(),
  effectiveFrom: z.string(),
});
export type PublicFeeRule = z.infer<typeof publicFeeRuleSchema>;

export const publicBranchSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  governorate: z.string(),
  nameAr: z.string(),
  nameEn: z.string().nullable(),
  addressAr: z.string().nullable(),
  addressEn: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  contacts: z.record(z.string(), z.unknown()),
  officeHours: z.record(z.string(), z.unknown()),
  completionServices: z.array(z.string()),
});
export type PublicBranch = z.infer<typeof publicBranchSchema>;

/** Step 1 of the application flow: create + submit. Profile photo must already be an uploaded, confirmed storage asset. */
export const membershipApplicationCreateSchema = honeypotSchema.extend({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(30),
  governorate: z.string().trim().min(2).max(60),
  legalName: z.string().trim().min(2).max(200).optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().trim().max(200).optional(),
  education: z.string().trim().max(200).optional(),
  address: z.record(z.string(), z.unknown()).optional().default({}),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  profilePhotoAssetId: z.number().int(),
  supportingDocumentAssetIds: z.array(z.number().int()).max(10).optional().default([]),
  consent: z.literal(true, { message: "يجب الموافقة على شروط العضوية قبل الإرسال" }),
  consentVersion: z.string().default("2026-01"),
  idempotencyKey: z.string().trim().min(8).max(100),
});
export type MembershipApplicationCreateInput = z.infer<typeof membershipApplicationCreateSchema>;

export const membershipApplicationDraftSchema = z.object({
  legalName: z.string().trim().min(2).max(200).optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().trim().max(200).optional(),
  education: z.string().trim().max(200).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
});
export type MembershipApplicationDraftInput = z.infer<typeof membershipApplicationDraftSchema>;

/** Requests a one-time applicant-access link (email magic link / OTP) for a given reference. */
export const membershipVerifyRequestSchema = z.object({
  email: z.string().trim().email(),
});
export type MembershipVerifyRequest = z.infer<typeof membershipVerifyRequestSchema>;

export const membershipVerifyConsumeSchema = z.object({
  token: z.string().trim().min(16),
});
export type MembershipVerifyConsume = z.infer<typeof membershipVerifyConsumeSchema>;

/** Public-safe status view returned after verified access — never includes internal notes. */
export const membershipApplicationStatusViewSchema = z.object({
  reference: z.string(),
  status: membershipApplicationStatusSchema,
  publicTimeline: z.array(
    z.object({
      status: membershipApplicationStatusSchema,
      publicMessage: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
  pendingActions: z.array(
    z.object({
      id: z.number().int(),
      publicInstructions: z.string(),
      requestedFields: z.array(z.string()),
      dueDate: z.string().nullable(),
    })
  ),
  recommendedBranch: publicBranchSchema.nullable(),
  currentFee: publicFeeRuleSchema.nullable(),
});
export type MembershipApplicationStatusView = z.infer<typeof membershipApplicationStatusViewSchema>;

export const membershipActionCompleteSchema = z.object({
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  supportingDocumentAssetIds: z.array(z.number().int()).max(10).optional().default([]),
});
export type MembershipActionCompleteInput = z.infer<typeof membershipActionCompleteSchema>;

/** Private current-member card payload. Only ever returned to a verified active member or authorized staff. */
export const membershipCardSchema = z.object({
  membershipNumber: z.string(),
  status: z.enum(["active", "suspended", "expired", "revoked"]),
  issuedAt: z.string(),
  expiresAt: z.string().nullable(),
  branchName: z.string(),
  renderAssetUrl: z.string().nullable(),
  shareEnabled: z.boolean(),
});
export type MembershipCardDto = z.infer<typeof membershipCardSchema>;

export const shareLinkActionSchema = z.object({
  action: z.enum(["create", "revoke"]),
});
export type ShareLinkAction = z.infer<typeof shareLinkActionSchema>;

export const shareLinkResponseSchema = z.object({
  shareUrl: z.string().nullable(),
  shareEnabled: z.boolean(),
});
export type ShareLinkResponse = z.infer<typeof shareLinkResponseSchema>;

/** Public share-card payload: only template-approved shareable fields, never address/phone/ID/payment/private data. */
export const publicShareCardSchema = z.object({
  memberDisplayName: z.string(),
  membershipStatus: z.enum(["active"]),
  branchName: z.string(),
  issuedYear: z.string(),
});
export type PublicShareCard = z.infer<typeof publicShareCardSchema>;

// ---------------------------------------------------------------------------
// Admin schemas
// ---------------------------------------------------------------------------

export const adminBranchUpsertSchema = z.object({
  governorate: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/),
  nameAr: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).optional(),
  addressAr: z.string().trim().max(500).optional(),
  addressEn: z.string().trim().max(500).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contacts: z.record(z.string(), z.unknown()).optional().default({}),
  officeHours: z.record(z.string(), z.unknown()).optional().default({}),
  completionServices: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
});
export type AdminBranchUpsertInput = z.infer<typeof adminBranchUpsertSchema>;

export const adminFeeRuleCreateSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().trim().min(2).max(10).default("EGP"),
  effectiveFrom: z.string(),
  waiverRules: z.record(z.string(), z.unknown()).optional().default({}),
});
export type AdminFeeRuleCreateInput = z.infer<typeof adminFeeRuleCreateSchema>;

export const adminMembershipDecisionSchema = z.object({
  action: z.enum([
    "assign_reviewer",
    "request_action",
    "accept_in_principle",
    "reject",
    "select_branch",
    "mark_fee_paid",
    "mark_fee_waived",
    "verify_documents",
    "book_appointment",
    "mark_attended",
    "complete",
    "issue_card",
    "revoke_membership",
    "suspend_membership",
  ]),
  reviewerId: z.number().int().optional(),
  branchId: z.number().int().optional(),
  publicInstructions: z.string().trim().max(1000).optional(),
  requestedFields: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  scheduledAt: z.string().optional(),
  note: z.string().trim().max(2000).optional(),
  publicMessage: z.string().trim().max(500).optional(),
});
export type AdminMembershipDecisionInput = z.infer<typeof adminMembershipDecisionSchema>;

export const adminCardTemplateUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  layoutConfig: z.record(z.string(), z.unknown()),
  allowedPublicFields: z.array(z.enum(["memberDisplayName", "membershipStatus", "branchName", "issuedYear"])),
  locale: localeSchema.default("ar"),
  active: z.boolean().default(false),
});
export type AdminCardTemplateUpsertInput = z.infer<typeof adminCardTemplateUpsertSchema>;
