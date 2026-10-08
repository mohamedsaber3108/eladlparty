import { env } from "cloudflare:workers";

const SESSION = "eladl_admin";
const maxAge = 60 * 60 * 8;

function readCookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function signature(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_TOKEN || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isAdmin(request: Request) {
  if (!env.ADMIN_TOKEN) return false;
  if (request.headers.get("x-admin-token") === env.ADMIN_TOKEN) return true;
  const raw = readCookie(request, SESSION);
  if (!raw) return false;
  const [encoded, proof] = raw.split(".");
  if (!encoded || !proof || proof !== await signature(encoded)) return false;
  try {
    const payload = JSON.parse(atob(encoded)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch { return false; }
}

export async function createAdminSession() {
  const encoded = btoa(JSON.stringify({ exp: Date.now() + maxAge * 1000 }));
  const proof = await signature(encoded);
  return `${SESSION}=${encoded}.${proof}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export const clearAdminSession = `${SESSION}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
