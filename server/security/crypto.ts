/** Shared low-level crypto helpers: hashing, HMAC signing, random token generation. */

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex digest. Used to hash tokens/IPs before storing them (never store raw secrets). */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

/** HMAC-SHA256 hex signature using the given secret key. */
export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

/** Generates a URL-safe random token (base64url, no padding) of the given byte length. */
export function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Hashes an IP address or user-agent string with a fixed, non-secret salt for privacy-minimized storage. */
export async function hashForAudit(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  return sha256Hex(`eladl-audit:${value}`);
}
