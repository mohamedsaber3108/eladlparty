import { Worker } from "bullmq";
import { getRedis } from "@/server/jobs/redis";
import { QUEUE_NAME } from "@/server/jobs/queue";
import { jobHandlers } from "@/server/jobs/handlers";
import { runScheduledPublishSweep } from "@/server/services/content-service";

/**
 * Standalone BullMQ worker process. Run as the `worker` service in docker-compose.yml
 * (`node --experimental-strip-types server/jobs/worker.ts` via the compiled/transpiled entry
 * point — see Dockerfile.worker), separate from the `web` Next.js process. This is the
 * EC2/Docker Compose replacement for both the old D1-outbox "manual drain" endpoint and for
 * Vercel Cron: a persistent process that continuously consumes the job queue and runs its own
 * scheduled sweep on an interval, rather than relying on externally-triggered HTTP invocations.
 */
async function main(): Promise<void> {
  const connection = getRedis();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = jobHandlers[job.name as keyof typeof jobHandlers];
      if (!handler) throw new Error(`No handler registered for job type "${job.name}"`);
      await handler(job.data as Record<string, unknown>);
    },
    { connection, concurrency: 5 }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} (${job.name}) completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[worker] job ${job?.id} (${job?.name}) failed:`, error.message);
  });

  // Scheduled-publish sweep: promotes content_entries rows with status=scheduled whose
  // scheduledAt has passed. Runs every 5 minutes for the lifetime of this process.
  const sweepIntervalMs = 5 * 60 * 1000;
  const runSweep = async () => {
    try {
      const count = await runScheduledPublishSweep();
      if (count > 0) console.log(`[worker] scheduled-publish sweep promoted ${count} entries`);
    } catch (error) {
      console.error("[worker] scheduled-publish sweep failed:", error);
    }
  };
  const sweepTimer = setInterval(runSweep, sweepIntervalMs);
  void runSweep(); // also run once immediately on startup

  console.log(`[worker] BullMQ worker started, listening on queue "${QUEUE_NAME}"`);

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down...`);
    clearInterval(sweepTimer);
    await worker.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] fatal error during startup:", error);
  process.exit(1);
});
