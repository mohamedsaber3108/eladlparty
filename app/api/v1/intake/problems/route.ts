import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { problemIntakeSchema } from "@/shared/contracts/intake";
import { createIntakeCase } from "@/server/services/intake-service";

/**
 * POST /api/v1/intake/problems — public "report a problem" form. Never creates a public
 * observatory record automatically; staff must moderate/verify via /api/v1/admin/observatory
 * before anything surfaces on /observatory/problems.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, problemIntakeSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "intake-problem", input.website);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A", status: "received" }, requestId, { status: 201 });

    const { reference } = await createIntakeCase({
      kind: "problem",
      contact: { name: input.name, email: input.email, phone: input.phone, governorate: input.governorate, profession: input.profession },
      narrativeBody: input.body,
      answers: { sector: input.sector, affectedGroup: input.affectedGroup },
      sourceRoute: "/submit/problem",
      request,
    });
    return jsonOk({ reference, status: "received" }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
