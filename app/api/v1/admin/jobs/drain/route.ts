import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { countFailedJobs } from "@/server/jobs/queue";
import { runScheduledPublishSweep } from "@/server/services/content-service";

/**
 * POST /api/v1/admin/jobs/drain — manually forces an immediate scheduled-publish sweep and
 * reports the current failed-job count.
 *
 * Background jobs themselves (notifications, search re-indexing, knowledge ingestion) are
 * processed continuously by the standalone BullMQ worker process (`server/jobs/worker.ts`,
 * the `worker` service in docker-compose.yml) — this endpoint does not "drain" a queue the way
 * the earlier Postgres-outbox design did. It exists for manual ops visibility and to avoid
 * waiting for the worker's periodic sweep interval during testing/support.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "settings.manage");
    const [scheduledPublished, failedJobs] = await Promise.all([runScheduledPublishSweep(), countFailedJobs()]);
    return jsonOk({ scheduledPublished, failedJobs }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
