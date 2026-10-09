#!/usr/bin/env node
/**
 * Bootstraps the roles/permissions catalogue and an initial super_admin user against the
 * project's D1 database via `wrangler d1 execute`. No secret is committed to Git — the
 * super-admin's email is passed as a CLI argument and the account signs in via magic link
 * (there is no password to set).
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs --email you@example.com [--local] [--db-name site-creator-d1]
 *
 * `--local` targets the local Miniflare D1 simulation used by `pnpm start`/`wrangler dev`.
 * Omit it to target the remote/production D1 database bound to this Cloudflare account
 * (requires `wrangler login` first).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : fallback;
}

const email = flag("email");
const local = args.includes("--local");
const dbName = flag("db-name", "site-creator-d1");

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/bootstrap-admin.mjs --email you@example.com [--local] [--db-name site-creator-d1]");
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
];

const now = new Date().toISOString();
const roleInserts = roles.map(([key, label]) => `INSERT INTO roles (key, label, created_at) SELECT '${key}', '${label}', '${now}' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE key = '${key}');`).join("\n");

const sql = `
${roleInserts}

INSERT INTO users (email, display_name, status, locale, created_at, updated_at)
SELECT '${email.toLowerCase()}', 'Super Admin', 'invited', 'ar', '${now}', '${now}'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '${email.toLowerCase()}');

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, '${now}'
FROM users u, roles r
WHERE u.email = '${email.toLowerCase()}' AND r.key = 'super_admin'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);
`.trim();

const tmpDir = mkdtempSync(path.join(tmpdir(), "eladl-bootstrap-"));
const sqlFile = path.join(tmpDir, "bootstrap.sql");
writeFileSync(sqlFile, sql, "utf8");

const wranglerArgs = ["d1", "execute", dbName, local ? "--local" : "--remote", "--file", sqlFile];
console.log(`Running: wrangler ${wranglerArgs.join(" ")}`);

const result = spawnSync("npx", ["wrangler", ...wranglerArgs], { stdio: "inherit", shell: true });
rmSync(tmpDir, { recursive: true, force: true });

if (result.status !== 0) {
  console.error("Bootstrap failed. Review the wrangler output above.");
  process.exit(result.status ?? 1);
}

console.log(`\nDone. ${email} now has the super_admin role.`);
console.log("Sign in at /admin and request a magic link for that email to start your session.");
