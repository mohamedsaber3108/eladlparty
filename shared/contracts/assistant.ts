import { z } from "zod";
import { localeSchema } from "./common";

export const assistantMessageRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  locale: localeSchema.default("ar"),
  contextPath: z.string().trim().max(300).optional(),
  sessionRef: z.string().trim().min(8).max(100).optional(),
});
export type AssistantMessageRequest = z.infer<typeof assistantMessageRequestSchema>;

export const assistantCitationSchema = z.object({
  title: z.string(),
  href: z.string(),
});
export type AssistantCitation = z.infer<typeof assistantCitationSchema>;

export const assistantMessageResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(assistantCitationSchema).default([]),
  source: z.enum(["knowledge-base", "guided", "unavailable"]),
  sessionRef: z.string(),
});
export type AssistantMessageResponse = z.infer<typeof assistantMessageResponseSchema>;
