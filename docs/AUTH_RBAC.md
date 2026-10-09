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
| `membership_officer` (additive, spec §15) | `membership.review`, `membership.decide`, `membership.complete`, `membership.card.issue`, `membership.export` — full membership-pipeline control |
| `branch_staff` (additive, spec §15) | `membership.complete` only — can run fee/document/appointment/completion steps but **cannot** accept/reject an application or issue a card |

Full permission key list: `content.create`, `content.update`, `content.publish`, `content.delete`, `content.translate`, `events.manage`, `programs.manage`, `opportunities.manage`, `partners.manage`, `observatory.manage`, `submission.view`, `submission.assign`, `submission.update`, `media.upload`, `media.delete`, `knowledge.manage`, `users.manage`, `roles.manage`, `settings.manage`, `audit.view`, `analytics.view`, `membership.review`, `membership.decide`, `membership.complete`, `membership.card.issue`, `membership.export`, `branch.manage`, `fees.manage`, `card_template.manage`, `monitoring.manage_sources`, `monitoring.review`, `discussion.moderate`.

### Action-level permission checks (membership decisions)

`POST /api/v1/admin/membership/:id/decide` is the one route in the system where a single endpoint requires **different permissions depending on the request body**, not just one permission for the whole route. This is intentional: `branch_staff` needs to perform in-person completion steps (fee/documents/appointment) without ever being able to accept, reject, or issue a card for an application. The route resolves the requested `action` first, looks up the specific permission it needs from a static map, and checks that — see `app/api/v1/admin/membership/[id]/decide/route.ts` and `docs/API.md`'s per-action permission table.

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

## Applicant access (membership, additive — spec §15)

Membership applicants are **not** staff and never get a `eladl_session` cookie or RBAC permissions. They get a separate, narrower mechanism:

1. `POST /api/v1/membership/applications/:reference/verify` with `{email}` issues a one-time token (SHA-256-hashed before storage in `membership_applications.verificationTokenHash`, 15-minute TTL) and emails a link via the same outbox/email-adapter path used elsewhere. Always returns 200 regardless of whether the reference/email pair matches — no enumeration.
2. The same endpoint, called with `{token}` instead, consumes the token (one-time — the hash is cleared immediately so it cannot be replayed) and sets a distinct `eladl_applicant_access` cookie: `HttpOnly; Secure; SameSite=Strict`, HMAC-signed (reusing `SESSION_SECRET` — see the note in `docs/FEATURE_BACKEND_MATRIX.md`'s Known Gaps), 30-minute `Max-Age`. The cookie's signed payload embeds the application's reference and expiry — nothing else.
3. Every subsequent membership endpoint that needs applicant identity (`GET .../applications/:reference`, `PATCH .../draft`, `POST .../actions/:id`, `GET /membership/cards/current`, `POST /membership/cards/:id/share-link`) checks this cookie, not the staff session. `assertApplicantAccess` additionally verifies the cookie's embedded reference matches the one in the URL (where a URL reference is present) — one applicant cannot read or act on another application by guessing a reference, since the cookie is bound to exactly one reference at verification time.
4. There is no "applicant login" beyond this — no password, no long-lived session, no account. A new access link must be requested each time the 30-minute window lapses.

## Session lifecycle

`invited → active → suspended → deleted` (brief §7). `invited` users become `active` automatically on their first successful magic-link verification. `suspended`/`deleted` users cannot request or verify a magic link, and any existing sessions are revoked immediately on suspension.
