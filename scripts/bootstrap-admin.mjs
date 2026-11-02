#!/usr/bin/env node
/**
 * Bootstraps the roles/permissions catalogue and an initial super_admin user against the
 * project's Postgres database. No secret is committed to Git — the super-admin's email is
 * passed as a CLI argument and the account signs in via magic link (there is no password to
 * set).
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs --email you@example.com
 *
 * Reads DATABASE_URL from the environment (.env.local in development, or the real Neon
 * connection string in CI/production). Run `dotenv -e .env.local -- node scripts/bootstrap-admin.mjs ...`
 * or export DATABASE_URL directly before invoking this script.
 */
import { Client } from "pg";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : fallback;
}

const email = flag("email");

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/bootstrap-admin.mjs --email you@example.com");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Export it (or load .env.local) before running this script.");
  process.exit(1);
}

const roles = [
  ["super_admin", "مدير عام"],
  ["admin", "مدير"],
  ["editor", "محرر"],
  ["reviewer", "مراجع"],
  ["program_manager", "مدير برامج"],
  ["observatory_analyst", "محلل مرصد"],
  ["media_manager", "مدير وسائط"],
  ["viewer", "مستعرض"],
  ["membership_officer", "مسؤول عضوية"],
  ["branch_staff", "موظف فرع"],
];

const now = new Date().toISOString();
const normalizedEmail = email.toLowerCase();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query("BEGIN");

  for (const [key, label] of roles) {
    await client.query(
      `INSERT INTO roles (key, label, created_at)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM roles WHERE key = $1)`,
      [key, label, now]
    );
  }

  await client.query(
    `INSERT INTO users (email, display_name, status, locale, created_at, updated_at)
     SELECT $1, 'Super Admin', 'invited', 'ar', $2, $2
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = $1)`,
    [normalizedEmail, now]
  );

  await client.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_at)
     SELECT u.id, r.id, $2
     FROM users u, roles r
     WHERE u.email = $1 AND r.key = 'super_admin'
       AND NOT EXISTS (
         SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
       )`,
    [normalizedEmail, now]
  );

  await client.query("COMMIT");
  console.log(`\nDone. ${normalizedEmail} now has the super_admin role.`);
  console.log("Sign in at /admin and request a magic link for that email to start your session.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Bootstrap failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
