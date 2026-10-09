import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { drainOutbox } from "@/server/jobs/outbox";
import { outboxHandlers } from "@/server/jobs/handlers";
import { runScheduledPublishSweep } from "@/server/services/content-service";

/**
 * POST /api/v1/admin/jobs/drain — manually drains pending outbox jobs (notifications, search
 * re-indexing, knowledge ingestion) and runs the scheduled-publish sweep. This project has no
 * Cloudflare Cron Trigger configured yet (no `[triggers]` block in a wrangler.toml at this
 * path), so background work only progresses when this endpoint — or a future cron — is called.
 * Wire a Cron Trigger to call this on a schedule once the project's wrangler config supports it.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "settings.manage");
    const [jobResult, scheduledPublished] = await Promise.all([drainOutbox(outboxHandlers), runScheduledPublishSweep()]);
    return jsonOk({ ...jobResult, scheduledPublished }, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
