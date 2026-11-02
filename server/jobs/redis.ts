import { Redis } from "ioredis";

/**
 * Shared Redis connection (standard TCP client via `ioredis`), used by both the rate limiter
 * (`server/services/rate-limit-service.ts`) and the BullMQ job queue/worker
 * (`server/jobs/queue.ts`, `server/jobs/worker.ts`).
 *
 * Points at Docker Redis in local development and Amazon ElastiCache (or any managed/
 * self-hosted Redis reachable over TCP) in production — see docker-compose.yml and
 * docs/DEPLOYMENT.md. No Upstash/REST-based client is used; this is a persistent TCP
 * connection, appropriate for the always-on Node.js process running on EC2 (not a serverless
 * function with per-invocation cold starts).
 */
let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not configured. Set it to a redis:// connection string before using Redis-backed features.");
    }
    client = new Redis(url, {
      // BullMQ requires this to be null (its own retry/backoff strategy manages reconnects).
      maxRetriesPerRequest: null,
    });
  }
  return client;
}
