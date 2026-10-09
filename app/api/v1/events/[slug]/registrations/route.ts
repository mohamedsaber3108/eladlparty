import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { eventRegistrationInputSchema } from "@/shared/contracts/events";
import { localeSchema } from "@/shared/contracts/common";
import { registerForEvent } from "@/server/services/events-service";

/** POST /api/v1/events/:slug/registrations — public event registration, enforcing window/capacity/dedup/waitlist. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const locale = localeSchema.catch("ar").parse(url.searchParams.get("locale") ?? "ar");
    const input = await parseJsonBody(request, eventRegistrationInputSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "event-registration", input.website);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A", status: "pending" }, requestId, { status: 201 });

    const result = await registerForEvent(slug, locale, input, request);
    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
