import { z } from "zod";
import { contentStatusSchema, contentTypeSchema } from "./content";
import { localeSchema } from "./common";

export const adminContentListQuerySchema = z.object({
  type: contentTypeSchema.optional(),
  status: contentStatusSchema.optional(),
  locale: localeSchema.optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminContentListQuery = z.infer<typeof adminContentListQuerySchema>;

export const adminContentCreateSchema = z.object({
  contentType: contentTypeSchema,
  canonicalSlug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/, "slug يجب أن يكون أحرف لاتينية صغيرة وأرقام وشرطات فقط"),
  locale: localeSchema.default("ar"),
  title: z.string().trim().min(3).max(300),
  excerpt: z.string().trim().min(3).max(600),
  bodyRichtext: z.string().trim().min(1),
  seoTitle: z.string().trim().max(300).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  category: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().max(60)).max(20).optional().default([]),
  coverAssetId: z.number().int().optional(),
  featured: z.boolean().optional().default(false),
  status: contentStatusSchema.optional().default("draft"),
});
export type AdminContentCreateInput = z.infer<typeof adminContentCreateSchema>;

export const adminContentUpdateSchema = adminContentCreateSchema.partial().extend({
  id: z.number().int(),
  changeNote: z.string().trim().max(500).optional(),
});
export type AdminContentUpdateInput = z.infer<typeof adminContentUpdateSchema>;

export const adminContentPublishActionSchema = z.object({
  id: z.number().int(),
  action: z.enum(["submit_review", "approve", "request_changes", "publish", "unpublish", "schedule", "archive"]),
  scheduledAt: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});
export type AdminContentPublishAction = z.infer<typeof adminContentPublishActionSchema>;

export const adminDashboardSchema = z.object({
  pendingCases: z.number().int(),
  scheduledContent: z.number().int(),
  upcomingRegistrations: z.number().int(),
  recentActivity: z.array(
    z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
  notificationFailures: z.number().int(),
  totals: z.object({
    content: z.number().int(),
    submissions: z.number().int(),
    media: z.number().int(),
  }),
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

export const adminUserUpsertSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().max(200).optional(),
  roleKeys: z.array(z.string()).min(1),
});
export type AdminUserUpsertInput = z.infer<typeof adminUserUpsertSchema>;

export const caseUpdateSchema = z.object({
  id: z.number().int(),
  status: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo: z.number().int().nullable().optional(),
  note: z.string().trim().max(2000).optional(),
  noteVisibility: z.enum(["internal", "public"]).optional().default("internal"),
});
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;
