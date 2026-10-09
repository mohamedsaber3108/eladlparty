import { z } from "zod";

export const mediaKindSchema = z.enum(["image", "video", "document"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const mediaAssetSchema = z.object({
  id: z.number().int(),
  kind: mediaKindSchema,
  title: z.string(),
  url: z.string(),
  alt: z.string().nullable(),
  createdAt: z.string(),
});
export type MediaAssetDto = z.infer<typeof mediaAssetSchema>;

export const mediaListQuerySchema = z.object({
  kind: mediaKindSchema.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

/** Allow-listed MIME types for staff uploads, by target kind. */
export const allowedMimeTypes: Record<MediaKind, string[]> = {
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
  document: ["application/pdf"],
};

export const maxUploadBytes: Record<MediaKind, number> = {
  image: 8 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

export const uploadSignRequestSchema = z.object({
  kind: mediaKindSchema,
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(3).max(100),
  size: z.number().int().positive(),
  alt: z.string().trim().max(300).optional(),
  title: z.string().trim().max(200).optional(),
});
export type UploadSignRequest = z.infer<typeof uploadSignRequestSchema>;

export const uploadSignResponseSchema = z.object({
  uploadUrl: z.string(),
  objectKey: z.string(),
  expiresAt: z.string(),
  pendingAssetId: z.number().int(),
});
export type UploadSignResponse = z.infer<typeof uploadSignResponseSchema>;

export const uploadConfirmRequestSchema = z.object({
  pendingAssetId: z.number().int(),
});
export type UploadConfirmRequest = z.infer<typeof uploadConfirmRequestSchema>;
