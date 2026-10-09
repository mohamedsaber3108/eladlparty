import { z } from "zod";
import { localeSchema } from "./common";

export const contentTypeSchema = z.enum([
  "news",
  "program",
  "initiative",
  "opportunity",
  "success_story",
  "report",
  "research",
  "publication",
  "resource",
  "policy_paper",
  "solution",
  "call",
  "announcement",
  "page",
  "faq",
]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const contentStatusSchema = z.enum([
  "draft",
  "review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "archived",
]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

/** Public-facing card shape used by listing grids. */
export const contentCardSchema = z.object({
  id: z.number().int(),
  contentType: contentTypeSchema,
  slug: z.string(),
  locale: localeSchema,
  title: z.string(),
  excerpt: z.string(),
  coverImageUrl: z.string().nullable(),
  featured: z.boolean(),
  publishedAt: z.string().nullable(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  href: z.string(),
});
export type ContentCard = z.infer<typeof contentCardSchema>;

/** Full public detail payload for a canonical content page. */
export const contentDetailSchema = contentCardSchema.extend({
  body: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  related: z.array(contentCardSchema).default([]),
  breadcrumbs: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
});
export type ContentDetail = z.infer<typeof contentDetailSchema>;

export const contentListQuerySchema = z.object({
  type: contentTypeSchema.optional(),
  locale: localeSchema.default("ar"),
  category: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  featured: z.coerce.boolean().optional(),
  q: z.string().trim().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["recent", "featured"]).default("recent"),
  // Legacy page/limit params kept so the current ContentBrowser keeps working.
  page: z.coerce.number().int().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

export const navigationNodeSchema: z.ZodType<{
  id: number;
  label: string;
  href: string;
  icon: string | null;
  children: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    label: z.string(),
    href: z.string(),
    icon: z.string().nullable(),
    children: z.array(navigationNodeSchema),
  })
);
export type NavigationNode = z.infer<typeof navigationNodeSchema>;

export const searchResultSchema = z.object({
  items: z.array(contentCardSchema),
  nextCursor: z.string().nullable(),
  query: z.string(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
