import { z } from "zod";

/**
 * Zod-validated reader over `process.env`, replacing the Cloudflare `cloudflare:workers` `env`
 * binding object used before the AWS/EC2 migration. Every field here was previously declared
 * in `cloudflare-env.d.ts`'s `Cloudflare.Env` interface, then adapted for AWS.
 *
 * Validation is lazy (triggered on first access, not at import time) so that this module can be
 * safely imported anywhere — including build-time code paths — without throwing in contexts
 * that don't need every variable (e.g. `next build` type-checking, or routes that don't touch
 * email/storage). Call `getEnv()` to get the fully-validated, typed object.
 */

const envSchema = z.object({
  // --- Database: PostgreSQL on Amazon RDS in production, Docker Postgres in development. ---
  DATABASE_URL: z.string().min(1).optional(),

  // --- Signs the membership applicant-access cookie (separate, narrow mechanism from staff
  // auth — see server/services/membership-service.ts). ---
  SESSION_SECRET: z.string().min(1).optional(),

  // --- Base public URL used to build magic-link / applicant-access verification URLs. ---
  PUBLIC_BASE_URL: z.string().url().optional(),

  // --- Transactional email provider (Resend, or any SMTP-compatible provider). ---
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // --- AWS S3 object storage (media uploads). On EC2, prefer an attached IAM instance role
  // over static AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY — leave those unset to let the SDK's
  // default credential provider chain resolve instance-role credentials automatically. ---
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().url().optional(), // only set for local dev against MinIO
  AWS_S3_PUBLIC_BASE_URL: z.string().url().optional(), // CloudFront/bucket public URL, if media is served directly

  // --- Redis: Docker Redis locally, Amazon ElastiCache (or self-managed Redis) in production.
  // Used for rate limiting (ioredis, INCR/EXPIRE) and as the BullMQ queue backend. ---
  REDIS_URL: z.string().min(1).optional(),

  // --- Auth.js v5 (staff identity/session source of truth). ---
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),

  // --- Cloudflare Turnstile secret for public write-form bot protection (not yet wired). ---
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // --- Optional AI provider adapter key for the assistant. Assistant degrades gracefully if unset. ---
  AI_PROVIDER_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Returns the fully Zod-validated environment. Throws with a clear message on type mismatches (e.g. a malformed URL). */
export function getEnv(): Env {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}
