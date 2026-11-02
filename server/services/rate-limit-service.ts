import { getRedis } from "@/server/jobs/redis";
import { clientIp } from "@/server/http/client-ip";

/**
 * Fixed-window rate limiter backed by Redis (`ioredis`), using `INCR` + `EXPIRE` on a
 * per-window key. This replaces the earlier Postgres-table-backed limiter: Redis is the
 * correct tool for this (sub-millisecond, naturally self-expiring, no table growth to clean
 * up) and is already provisioned on the AWS/EC2 stack for BullMQ.
 */
export async function consumeRateLimit(bucketKey: string, maxCount: number, windowMs: number): Promise<boolean> {
  const redis = getRedis();
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `ratelimit:${bucketKey}:${windowStart}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // Only the request that created this window's counter sets its expiry, avoiding a
    // race where every request resets the TTL and the key never expires.
    await redis.pexpire(key, windowMs);
  }
  return count <= maxCount;
}

/** Derives a stable per-IP bucket key, falling back to a shared bucket if no IP header is present. */
export function ipBucketKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request) ?? "unknown"}`;
}
