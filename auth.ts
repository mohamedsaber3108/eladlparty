import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { getEmailAdapter } from "@/server/notifications/email-adapter";

/**
 * Auth.js v5 configuration — the identity/session source of truth for staff sign-in, backed
 * by Postgres via @auth/drizzle-adapter with database sessions (not JWT). Staff sign in with
 * a one-time email link (no passwords); the adapter owns `auth_users`/`auth_accounts`/
 * `auth_sessions`/`auth_verification_tokens` (see db/schema.ts for why these are separate
 * from the domain `users` table).
 *
 * This file does not decide RBAC — it only authenticates an email address. Permission/role
 * resolution against the domain `users`/`user_roles`/`roles` tables happens in
 * `server/http/with-auth.ts`, which is the single choke point every admin API route already
 * calls via `requireStaff`/`requireAnySession`.
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: schema.authUsers,
    accountsTable: schema.authAccounts,
    sessionsTable: schema.authSessions,
    verificationTokensTable: schema.authVerificationTokens,
  }),
  session: { strategy: "database" },
  pages: {
    signIn: "/admin/login",
    verifyRequest: "/admin/login?sent=1",
    error: "/admin/login?error=1",
  },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM ?? "notifications@example.com",
      maxAge: 15 * 60, // 15 minutes, matching the portal's existing magic-link TTL convention
      async sendVerificationRequest({ identifier, url }) {
        // Only ever send to an email that already has an active/invited staff account —
        // this mirrors the old magic-link flow's "no account enumeration" behavior: Auth.js
        // itself will still create an auth_users row for any email that completes the flow,
        // but requireStaff/requireAnyStaff reject anyone without a matching domain `users`
        // row and roles, so completing sign-in alone grants no access.
        const db = getDb();
        const [domainUser] = await db.select().from(schema.users).where(eq(schema.users.email, identifier.toLowerCase())).limit(1);
        if (!domainUser || domainUser.status === "suspended" || domainUser.status === "deleted") {
          // Silently succeed from the caller's perspective (requestMagicLink's old contract);
          // Auth.js's own route always returns a generic "check your email" response regardless.
          return;
        }
        const result = await getEmailAdapter().send({
          to: identifier,
          subject: "رابط تسجيل الدخول — أمانة ريادة الأعمال المركزية",
          text: `استخدم هذا الرابط لتسجيل الدخول خلال 15 دقيقة: ${url}\nإذا لم تطلب هذا الرابط، تجاهل هذه الرسالة.`,
        });
        if (!result.ok) throw new Error(result.error ?? "email_send_failed");
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      // Gate sign-in itself (not just later permission checks) on having an active/invited
      // domain user row, so a stray Auth.js session can never be created for an unknown or
      // suspended email.
      if (!user.email) return false;
      const db = getDb();
      const [domainUser] = await db.select().from(schema.users).where(eq(schema.users.email, user.email.toLowerCase())).limit(1);
      if (!domainUser || domainUser.status === "suspended" || domainUser.status === "deleted") return false;
      if (domainUser.status === "invited") {
        await db.update(schema.users).set({ status: "active", updatedAt: new Date().toISOString() }).where(eq(schema.users.id, domainUser.id));
      }
      await db.update(schema.users).set({ lastLoginAt: new Date().toISOString() }).where(eq(schema.users.id, domainUser.id));
      return true;
    },
  },
});
