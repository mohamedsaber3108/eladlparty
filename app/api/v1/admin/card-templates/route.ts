import { requestIdFrom } from "@/server/http/request-id";
import { jsonOk, toErrorResponse } from "@/server/http/errors";
import { requireStaff } from "@/server/http/with-auth";
import { parseJsonBody } from "@/server/http/validate";
import { adminCardTemplateUpsertSchema } from "@/shared/contracts/membership";
import { createCardTemplate, listCardTemplates } from "@/server/services/card-template-service";

/** GET /api/v1/admin/card-templates — versioned template list. */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    await requireStaff(request, "card_template.manage");
    const templates = await listCardTemplates();
    return jsonOk(templates, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

/** POST /api/v1/admin/card-templates — creates a new version. Only one template can be active at a time. */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const user = await requireStaff(request, "card_template.manage");
    const input = await parseJsonBody(request, adminCardTemplateUpsertSchema);
    const id = await createCardTemplate(input, user.id);
    return jsonOk({ id }, requestId, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
