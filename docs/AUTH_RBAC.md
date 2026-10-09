# Authentication & RBAC

## Staff authentication: magic link + server-side session

Replaces the trial-era shared `ADMIN_TOKEN`. Flow:

1. `POST /api/v1/auth/magic-link {email}` — if a `users` row exists with that email and status `invited`/`active`, a one-time token is generated, hashed (SHA-256) and stored in `magic_link_tokens` with a 15-minute expiry, and an email is queued via the notification outbox. The endpoint **always returns 200** regardless of whether the email exists, to prevent account enumeration.
2. The emailed link points to `{PUBLIC_BASE_URL}/admin/verify?token=...`. The admin frontend (not yet built — see `docs/FEATURE_BACKEND_MATRIX.md`) should call `POST /api/v1/auth/verify {token}` with that token.
3. On success, the token is marked consumed (one-time use), a `sessions` row is created (random 32-byte token, SHA-256-hashed before storage, 8-hour expiry, IP/user-agent hashed for audit), and two cookies are set:
   - `eladl_session` — `HttpOnly; Secure; SameSite=Strict`, holds `{sessionToken}.{HMAC-SHA256 signature using SESSION_SECRET}`.
   - `eladl_csrf` — **not** HttpOnly (the SPA needs to read it), `Secure; SameSite=Strict`, a random value the frontend must echo back as `x-csrf-token` on every mutating request (double-submit CSRF pattern).
4. `GET /api/v1/auth/me` resolves the session into `{authenticated, user: {id, email, displayName, roles, permissions}}`.
5. `POST /api/v1/auth/logout` marks the `sessions` row `revokedAt` and clears both cookies.

No password is ever set or stored. There is no "forgot password" flow because there is no password.

### Why this instead of a full OIDC/SSO provider

The brief allows "SSO/OIDC later through an adapter." Magic-link is the default per the brief's §3.2. No OIDC provider credentials exist in this environment, so magic-link is both the production default and the only implemented mechanism today. Swapping in SSO later means adding a new `server/services/sso-adapter.ts` that also resolves to a `sessions` row — the rest of the auth/RBAC plumbing (cookies, CSRF, permission checks) does not need to change.

### CSRF defense in depth

Because `eladl_session` is `SameSite=Strict`, cross-site requests cannot even carry the cookie in modern browsers — this already blocks most CSRF. The `eladl_csrf` double-submit header is a second layer for defense in depth (e.g. against browser bugs or same-site-but-cross-page attacks). `server/http/with-auth.ts`'s `requireStaff`/`requireAnySession` enforce the CSRF check on every method except GET/HEAD.

## RBAC: roles and permissions

Roles are stored in `roles`/`user_roles`; permissions are **not** stored per-row in the database — they are a fixed compile-time matrix (`shared/contracts/auth.ts` → `defaultRolePermissions`) mapped from role key to permission keys. This keeps permission checks fast (no extra joins beyond resolving a user's role keys) and auditable (the matrix is one file, reviewed in code review like any other security-relevant logic).

| Role (`roles.key`) | Granted permissions |
|---|---|
| `super_admin` | everything, including `users.manage`/`roles.manage` over other `super_admin` accounts |
| `admin` | everything except managing `super_admin` accounts |
| `editor` | `content.create`, `content.update`, `content.translate` — cannot publish |
| `reviewer` | `content.update`, `content.publish`, `submission.view`, `submission.update`, `knowledge.manage` |
| `program_manager` | `programs.manage`, `opportunities.manage`, `events.manage`, `partners.manage`, `submission.view`, `submission.update` |
| `observatory_analyst` | `observatory.manage`, `analytics.view` |
| `media_manager` | `media.upload`, `media.delete` |
| `viewer` | `analytics.view` only |

Full permission key list: `content.create`, `content.update`, `content.publish`, `content.delete`, `content.translate`, `events.manage`, `programs.manage`, `opportunities.manage`, `partners.manage`, `observatory.manage`, `submission.view`, `submission.assign`, `submission.update`, `media.upload`, `media.delete`, `knowledge.manage`, `users.manage`, `roles.manage`, `settings.manage`, `audit.view`, `analytics.view`.

### Enforcement

Every admin route calls `requireStaff(request, "<permission>")` (`server/http/with-auth.ts`), which:
1. Resolves the session (`auth-service.getSessionUser`) — 401 if absent/expired/revoked.
2. Checks the permission against the user's resolved permission set (`server/policies/rbac.ts: requirePermission`) — 403 if missing.
3. Verifies CSRF for non-GET/HEAD requests.

Permissions are **never** checked client-side as a security boundary — the frontend may hide UI based on `GET /api/v1/auth/me`'s `permissions` array for UX, but every mutation re-checks server-side regardless of what the client sends.

### Self-lockout and super_admin protection

`server/policies/rbac.ts: assertCanManageTarget` blocks a non-`super_admin` actor from creating/editing/suspending a `super_admin` account. `users-service.suspendStaffUser` additionally blocks suspending your own account. These are the two safeguards the brief's quality gates call out explicitly (§11.6 self-lockout, §3.3 role boundaries).

## Bootstrapping the first super_admin

There is no UI for this by design — the very first admin can't log in before they exist. Run:

```bash
pnpm bootstrap:admin:local --email you@example.com   # against the local D1 (wrangler dev / Miniflare)
pnpm bootstrap:admin:remote --email you@example.com  # against the real Cloudflare D1 (requires `wrangler login`)
```

This seeds the 8 roles (idempotent) and creates/promotes a `users` row with the `super_admin` role via `wrangler d1 execute` and a generated idempotent SQL script (`scripts/bootstrap-admin.mjs`). No secret or password is written anywhere — the new super_admin signs in via the normal magic-link flow once created. Verified working end-to-end against a local D1 instance during this implementation (see `docs/OPERATIONS_RUNBOOK.md`).

## Session lifecycle

`invited → active → suspended → deleted` (brief §7). `invited` users become `active` automatically on their first successful magic-link verification. `suspended`/`deleted` users cannot request or verify a magic link, and any existing sessions are revoked immediately on suspension.
