import { RateLimitedError } from "@/server/http/errors";
import { consumeRateLimit, ipBucketKey } from "@/server/services/rate-limit-service";

/**
 * Shared guard for public write endpoints (intake forms, contact, partnership requests,
 * assistant messages): rate limits by IP and silently drops honeypot-triggered submissions.
 * Returns `{ isHoneypotTriggered: true }` instead of throwing so the caller can respond with a
 * fake-success 201 (matching the spam-trap behavior already used by the legacy /api/submissions
 * route) without revealing the anti-abuse mechanism to the bot.
 */
export async function guardPublicWrite(
  request: Request,
  scope: string,
  honeypotValue: string,
  maxCount = 10,
  windowMs = 10 * 60 * 1000
): Promise<{ isHoneypotTriggered: boolean }> {
  if (honeypotValue) return { isHoneypotTriggered: true };
  const allowed = await consumeRateLimit(ipBucketKey(request, scope), maxCount, windowMs);
  if (!allowed) throw new RateLimitedError();
  return { isHoneypotTriggered: false };
}
