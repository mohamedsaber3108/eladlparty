import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { volunteerIntakeSchema } from "@/shared/contracts/intake";
import { createIntakeCase } from "@/server/services/intake-service";

/** POST /api/v1/intake/volunteer — public volunteer-with-skills form. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, volunteerIntakeSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "intake-volunteer", input.website);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A", status: "received" }, requestId, { status: 201 });

    const { reference } = await createIntakeCase({
      kind: "volunteer",
      contact: { name: input.name, email: input.email, phone: input.phone, governorate: input.governorate, profession: input.profession },
      narrativeBody: input.body,
      answers: { skills: input.skills, availability: input.availability },
      sourceRoute: "/volunteer",
      request,
    });
    return jsonOk({ reference, status: "received" }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
