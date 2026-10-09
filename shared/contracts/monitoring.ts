import { z } from "zod";

export const monitoringSourceTypeSchema = z.enum(["rss", "official_website", "approved_api", "manual"]);
export const monitoringItemTypeSchema = z.enum(["news", "report", "issue", "data_point"]);
export const monitoringVerificationStateSchema = z.enum(["unverified", "verified", "rejected"]);

export const adminMonitoringSourceUpsertSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sourceType: monitoringSourceTypeSchema,
  configSecretRef: z.string().trim().max(200).optional(),
  topicScope: z.string().trim().max(200).optional(),
  language: z.enum(["ar", "en"]).default("ar"),
  legalReviewStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
  active: z.boolean().default(false),
});
export type AdminMonitoringSourceUpsertInput = z.infer<typeof adminMonitoringSourceUpsertSchema>;

/** Manual ingestion entry — always creates a private candidate record, never publishes directly. */
export const adminMonitoringIngestionCreateSchema = z.object({
  sourceId: z.number().int(),
  externalUrl: z.string().trim().url().max(500).optional(),
  externalId: z.string().trim().max(200).optional(),
  headline: z.string().trim().min(3).max(400),
  permittedExcerpt: z.string().trim().max(2000).optional(),
  publicationDate: z.string().optional(),
});
export type AdminMonitoringIngestionCreateInput = z.infer<typeof adminMonitoringIngestionCreateSchema>;

export const adminMonitoringItemCreateSchema = z.object({
  ingestionId: z.number().int(),
  itemType: monitoringItemTypeSchema.default("news"),
  sector: z.string().trim().max(120).optional(),
  governorate: z.string().trim().max(100).optional(),
});
export type AdminMonitoringItemCreateInput = z.infer<typeof adminMonitoringItemCreateSchema>;

export const adminMonitoringItemReviewSchema = z.object({
  verificationState: monitoringVerificationStateSchema,
  relevanceScore: z.number().int().min(0).max(100).optional(),
  visibility: z.enum(["private", "public"]).optional(),
  linkedType: z.enum(["problem", "solution", "policy", "report", "event", "program", "discussion_topic"]).optional(),
  linkedId: z.number().int().optional(),
});
export type AdminMonitoringItemReviewInput = z.infer<typeof adminMonitoringItemReviewSchema>;

/** Public monitoring record — only verified+public items, always carrying source/date/verification metadata. */
export const publicMonitoringItemSchema = z.object({
  id: z.number().int(),
  itemType: monitoringItemTypeSchema,
  headline: z.string(),
  excerpt: z.string().nullable(),
  sourceName: z.string(),
  publicationDate: z.string().nullable(),
  verificationState: z.literal("verified"),
  sector: z.string().nullable(),
  governorate: z.string().nullable(),
  links: z.array(z.object({ linkedType: z.string(), linkedId: z.number().int() })),
});
export type PublicMonitoringItem = z.infer<typeof publicMonitoringItemSchema>;

export const adminDiscussionTopicUpsertSchema = z.object({
  title: z.string().trim().min(3).max(300),
  linkedMonitoringItemId: z.number().int().optional(),
  publicStatus: z.enum(["draft", "open", "closed", "archived"]).default("draft"),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  moderationPolicy: z.enum(["form_only", "moderated_comments"]).default("form_only"),
  outcomeContentEntryId: z.number().int().optional(),
});
export type AdminDiscussionTopicUpsertInput = z.infer<typeof adminDiscussionTopicUpsertSchema>;
