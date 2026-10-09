import { and, eq, sql } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";

/**
 * Fixed-window rate limiter backed by D1 (`rate_limit_events`). Not as precise as a Durable
 * Object token bucket, but requires no extra Cloudflare bindings and is safe under D1's
 * single-writer-per-row semantics for the traffic volumes this portal expects.
 */
export async function consumeRateLimit(bucketKey: string, maxCount: number, windowMs: number): Promise<boolean> {
  const db = getDb();
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const now = nowIso();

  const [existing] = await db
    .select()
    .from(schema.rateLimitEvents)
    .where(and(eq(schema.rateLimitEvents.bucketKey, bucketKey), eq(schema.rateLimitEvents.windowStart, windowStart)))
    .limit(1);

  if (!existing) {
    await db.insert(schema.rateLimitEvents).values({ bucketKey, windowStart, count: 1, createdAt: now }).onConflictDoNothing();
    return true;
  }

  if (existing.count >= maxCount) return false;

  await db
    .update(schema.rateLimitEvents)
    .set({ count: sql`${schema.rateLimitEvents.count} + 1` })
    .where(eq(schema.rateLimitEvents.id, existing.id));
  return true;
}

/** Derives a stable per-IP bucket key, falling back to a shared bucket if no IP header is present. */
export function ipBucketKey(request: Request, scope: string): string {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  return `${scope}:${ip}`;
}
