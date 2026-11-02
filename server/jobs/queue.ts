import { Queue } from "bullmq";
import { getRedis } from "@/server/jobs/redis";

export type JobType = "notification" | "search_index" | "knowledge_ingest";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;
export type JobHandlers = Record<JobType, JobHandler>;

/**
 * BullMQ job queue name. The producer (this module, used from Next.js route handlers/services)
 * and the consumer (`server/jobs/worker.ts`, a standalone long-lived process — the `worker`
 * service in docker-compose.yml) share this Redis-backed queue.
 */
export const QUEUE_NAME = "eladl-jobs";

let queue: Queue | undefined;

function getQueue(): Queue {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  return queue;
}

/**
 * Enqueues a background job (notification send, search re-index, assistant knowledge
 * ingestion) for the standalone worker process to pick up. Replaces the earlier Postgres-table
 * outbox: BullMQ gives real push-based delivery, automatic retries with backoff, and dead-letter
 * visibility, backed by the same Redis instance already provisioned for rate limiting.
 */
export async function enqueueJob(jobType: JobType, payload: Record<string, unknown>): Promise<void> {
  await getQueue().add(jobType, payload, {
    attempts: 5,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  });
}

/** Count of jobs currently in the queue's failed state, surfaced on the admin dashboard. */
export async function countFailedJobs(): Promise<number> {
  return getQueue().getFailedCount();
}
