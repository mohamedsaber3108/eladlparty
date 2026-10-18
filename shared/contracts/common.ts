import { z } from "zod";

/** Standard locale values supported across the portal. */
export const localeSchema = z.enum(["ar", "en"]);
export type Locale = z.infer<typeof localeSchema>;

/** Cursor-based pagination query params shared by every list endpoint. */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

/** Legacy page/limit pagination kept for the existing frontend until migrated. */
export const pagePaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type PagePaginationQuery = z.infer<typeof pagePaginationQuerySchema>;

export const cursorMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  limit: z.number().int(),
});
export type CursorMeta = z.infer<typeof cursorMetaSchema>;

/** `{ data, meta?, error?, requestId }` response envelope used by every /api/v1 route. */
export function successEnvelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
    error: z.null().optional(),
    requestId: z.string(),
  });
}

/** RFC 9457-flavoured structured error body. */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  requestId: z.string(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export const errorEnvelopeSchema = z.object({
  data: z.null(),
  error: problemDetailsSchema,
  requestId: z.string(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Builds a `{data, meta, requestId}` success body. */
export function dataResponse<T>(data: T, requestId: string, meta?: Record<string, unknown>) {
  return { data, meta, error: null as null, requestId };
}

/** Builds a structured error body matching `problemDetailsSchema`. */
export function problemResponse(
  requestId: string,
  status: number,
  title: string,
  detail?: string,
  fieldErrors?: Record<string, string[]>
): ErrorEnvelope {
  return {
    data: null,
    error: {
      type: `https://eladl.party/errors/${status}`,
      title,
      status,
      detail,
      fieldErrors,
      requestId,
    },
    requestId,
  };
}

/** Common consent acknowledgement shape required on every public write form. */
export const consentSchema = z.object({
  consent: z.literal(true, {
    message: "يجب الموافقة على الشروط قبل الإرسال",
  }),
});

/**
 * Honeypot field: real users leave it empty; bots that fill every field trip it.
 * Deliberately accepts any string (no max-length validation) so a non-empty value never
 * surfaces as a 400 validation error — that would reveal the anti-abuse mechanism to the bot.
 * `guardPublicWrite` is the sole gate that inspects this value and routes it to a fake-success
 * response instead.
 */
export const honeypotSchema = z.object({
  website: z.string().optional().default(""),
});
