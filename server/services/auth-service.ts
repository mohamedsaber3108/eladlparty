import { env } from "cloudflare:workers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { hashForAudit, hmacSha256Hex, randomToken, sha256Hex } from "@/server/security/crypto";
import { getEmailAdapter } from "@/server/notifications/email-adapter";
import { ConflictError, RateLimitedError, UnauthorizedError } from "@/server/http/errors";
import { defaultRolePermissions, type PermissionKey, type RoleKey, type SessionUser } from "@/shared/contracts/auth";
import { consumeRateLimit } from "@/server/services/rate-limit-service";
import { recordAuditLog } from "@/server/services/audit-service";

const SESSION_COOKIE = "eladl_session";
/** Non-HttpOnly double-submit CSRF cookie: readable by the admin SPA's JS, echoed back as a header. */
const CSRF_COOKIE = "eladl_csrf";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h server-side session record lifetime
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // one-time, 15 minute expiry

function sessionSecret(): string {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured. Set it before enabling staff authentication.");
  return secret;
}

function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/** Requests a one-time magic sign-in link for the given email. Always returns success-shaped data (no account enumeration). */
export async function requestMagicLink(email: string, request: Request): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const allowed = await consumeRateLimit(`magic-link:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!allowed) throw new RateLimitedError("عدد كبير من طلبات تسجيل الدخول لهذا البريد، حاول بعد قليل");

  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
  // Deliberately do not reveal whether the account exists: always "succeed" from the caller's perspective.
  if (!user || user.status !== "active" && user.status !== "invited") return;

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();
  const ipHash = await hashForAudit(ip);

  await db.insert(schema.magicLinkTokens).values({
    email: email.toLowerCase(),
    tokenHash,
    purpose: "login",
    createdAt: now,
    expiresAt,
    requestIpHash: ipHash,
  });

  const baseUrl = env.PUBLIC_BASE_URL ?? "http://localhost:5173";
  const verifyUrl = `${baseUrl}/admin/verify?token=${token}`;
  await getEmailAdapter().send({
    to: email,
    subject: "رابط تسجيل الدخول — أمانة ريادة الأعمال المركزية",
    text: `استخدم هذا الرابط لتسجيل الدخول خلال 15 دقيقة: ${verifyUrl}\nإذا لم تطلب هذا الرابط، تجاهل هذه الرسالة.`,
  });
}

export interface SessionCookies {
  sessionCookie: string;
  csrfCookie: string;
}

/** Verifies a magic-link token and creates a server-side session. Returns the Set-Cookie header values. */
export async function verifyMagicLink(token: string, request: Request): Promise<SessionCookies> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = nowIso();

  const [record] = await db
    .select()
    .from(schema.magicLinkTokens)
    .where(and(eq(schema.magicLinkTokens.tokenHash, tokenHash), eq(schema.magicLinkTokens.purpose, "login")))
    .limit(1);

  if (!record || record.consumedAt || record.expiresAt < now) {
    throw new UnauthorizedError("رابط تسجيل الدخول غير صالح أو منتهي الصلاحية");
  }

  await db.update(schema.magicLinkTokens).set({ consumedAt: now }).where(eq(schema.magicLinkTokens.id, record.id));

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, record.email)).limit(1);
  if (!user || user.status === "suspended" || user.status === "deleted") {
    throw new UnauthorizedError("الحساب غير متاح لتسجيل الدخول");
  }

  if (user.status === "invited") {
    await db.update(schema.users).set({ status: "active", updatedAt: now }).where(eq(schema.users.id, user.id));
  }
  await db.update(schema.users).set({ lastLoginAt: now }).where(eq(schema.users.id, user.id));

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const sessionToken = randomToken(32);
  const sessionTokenHash = await sha256Hex(sessionToken);
  const csrfSecret = randomToken(24);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await db.insert(schema.sessions).values({
    userId: user.id,
    tokenHash: sessionTokenHash,
    csrfSecret,
    ipHash: await hashForAudit(ip),
    userAgentHash: await hashForAudit(request.headers.get("user-agent")),
    createdAt: now,
    expiresAt,
  });

  await recordAuditLog({ actorUserId: user.id, action: "auth.login", entityType: "session", entityId: null, requestId: null });

  const signedValue = `${sessionToken}.${await hmacSha256Hex(sessionSecret(), sessionToken)}`;
  const csrfToken = randomToken(24);
  return {
    sessionCookie: `${SESSION_COOKIE}=${signedValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    csrfCookie: `${CSRF_COOKIE}=${csrfToken}; Path=/; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  };
}

/** Resolves the current staff session (if any) into a `SessionUser` with roles/permissions attached. */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const [token, proof] = raw.split(".");
  if (!token || !proof) return null;
  if (proof !== (await hmacSha256Hex(secret, token))) return null;

  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.tokenHash, tokenHash), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, now)))
    .limit(1);
  if (!session) return null;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
  if (!user || user.status !== "active") return null;

  const roleRows = await db
    .select({ key: schema.roles.key })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, user.id));
  const roleKeys = roleRows.map((r) => r.key as RoleKey);

  const permissionSet = new Set<PermissionKey>();
  for (const roleKey of roleKeys) {
    for (const permission of defaultRolePermissions[roleKey] ?? []) permissionSet.add(permission);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: roleKeys,
    permissions: Array.from(permissionSet),
  };
}

/** Revokes the current session (logout). Returns the Set-Cookie header values that clear both cookies. */
export async function revokeCurrentSession(request: Request): Promise<SessionCookies> {
  const secret = env.SESSION_SECRET;
  const raw = secret ? readCookie(request, SESSION_COOKIE) : undefined;
  if (raw && secret) {
    const [token, proof] = raw.split(".");
    if (token && proof === (await hmacSha256Hex(secret, token))) {
      const db = getDb();
      const tokenHash = await sha256Hex(token);
      await db.update(schema.sessions).set({ revokedAt: nowIso() }).where(eq(schema.sessions.tokenHash, tokenHash));
    }
  }
  return {
    sessionCookie: `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    csrfCookie: `${CSRF_COOKIE}=; Path=/; Secure; SameSite=Strict; Max-Age=0`,
  };
}

/**
 * Verifies the CSRF double-submit pattern for cookie-authenticated mutations: the non-HttpOnly
 * `eladl_csrf` cookie value must be echoed back as the `x-csrf-token` header. A cross-site page
 * cannot read the cookie to forge the header, so this blocks CSRF without exposing the session token.
 */
export function assertCsrfValid(request: Request): void {
  const cookieValue = readCookie(request, CSRF_COOKIE);
  const header = request.headers.get("x-csrf-token");
  if (!cookieValue || !header || cookieValue !== header) {
    throw new ConflictError("رمز CSRF غير صالح أو مفقود");
  }
}
