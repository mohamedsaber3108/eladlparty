/**
 * Best-effort client IP extraction for rate limiting and audit logging.
 *
 * Vercel's edge/runtime network layer sets `x-forwarded-for` (and `x-real-ip`) on every
 * request; it does not set Cloudflare's `cf-connecting-ip`. `x-forwarded-for` may contain a
 * comma-separated list (client, proxy1, proxy2, ...) — the first entry is the original client.
 */
export function clientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
