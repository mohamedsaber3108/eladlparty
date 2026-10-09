import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { guardPublicWrite } from "@/server/http/public-write-guard";
import { ideaIntakeSchema } from "@/shared/contracts/intake";
import { createIntakeCase } from "@/server/services/intake-service";

/** POST /api/v1/intake/ideas — public "submit an idea" form. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const input = await parseJsonBody(request, ideaIntakeSchema);
    const { isHoneypotTriggered } = await guardPublicWrite(request, "intake-idea", input.website);
    if (isHoneypotTriggered) return jsonOk({ reference: "N/A", status: "received" }, requestId, { status: 201 });

    const { reference } = await createIntakeCase({
      kind: "idea",
      contact: { name: input.name, email: input.email, phone: input.phone, governorate: input.governorate, profession: input.profession },
      narrativeBody: input.body,
      answers: { field: input.field },
      sourceRoute: "/submit/idea",
      request,
    });
    return jsonOk({ reference, status: "received" }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
