/** Generates a per-request correlation id, reusing an inbound `x-request-id` header if present. */
export function requestIdFrom(request: Request): string {
  const inbound = request.headers.get("x-request-id");
  if (inbound && inbound.length <= 100) return inbound;
  return crypto.randomUUID();
}
