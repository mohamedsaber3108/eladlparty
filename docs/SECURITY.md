# Security Notes

## Authentication & session security

- No passwords are stored anywhere — magic-link only. See `docs/AUTH_RBAC.md`.
- Session tokens and magic-link tokens are never stored raw: both are SHA-256-hashed before persisting to D1 (`sessions.tokenHash`, `magic_link_tokens.tokenHash`). Only the hash is queried on verification.
- Session cookie: `HttpOnly; Secure; SameSite=Strict`, HMAC-signed with `SESSION_SECRET`, 8-hour server-side expiry, revocable (`sessions.revokedAt`).
- CSRF: double-submit pattern via a separate non-HttpOnly `eladl_csrf` cookie + `x-csrf-token` header, enforced on every non-GET/HEAD staff request. See `docs/AUTH_RBAC.md` for why `SameSite=Strict` alone isn't treated as sufficient.
- Magic-link requests never reveal whether an email has an account (always 200). Rate-limited 5 requests / 15 minutes / email to slow enumeration/spam attempts regardless.
- IP addresses and user agents are **hashed** (`server/security/crypto.ts: hashForAudit`, SHA-256 with a fixed non-secret prefix) before being stored in `sessions.ipHash`/`userAgentHash`, `magic_link_tokens.requestIpHash`, `audit_logs.ipHash`, `intake_cases.ipHash` — raw IPs are never persisted.

## Input validation & injection

- Every API body/query is parsed through a Zod schema (`shared/contracts/*`) before touching a service. There is no endpoint that passes raw client input directly into a SQL string.
- All D1 access goes through Drizzle's query builder (`server/repositories/db.ts: getDb()`), which parameterizes every value. No string-concatenated SQL exists anywhere in the new `server/`/`app/api/v1` code. (The pre-existing legacy routes under `app/api/{content,submissions,chat,media,admin}` use `env.DB.prepare(...).bind(...)`, which is also parameterized — the one dynamic table-name interpolation in `app/api/admin/[resource]/route.ts` is safe because `resource` is validated against a fixed `tables` map before being used, never passed through to SQL directly.)
- The `/api/v1/admin/content/*` slug field is restricted to `^[a-z0-9-]+$` by its Zod schema — no path-traversal or script-injection surface via slugs.

## Rate limiting & anti-abuse

- Public write endpoints: honeypot field (`website`, must be empty) + D1-backed fixed-window IP rate limiting (`server/services/rate-limit-service.ts`), 10 requests / 10 minutes per endpoint-scope by default. The assistant endpoint uses a tighter 20/minute/IP window given its higher natural call frequency.
- **Not yet implemented:** Cloudflare Turnstile verification — the secret (`TURNSTILE_SECRET_KEY`) is declared in `cloudflare-env.d.ts` but no route calls the Turnstile siteverify API yet, because no site/secret key pair has been provisioned for this project. The honeypot + rate limiter provide a baseline, but this is a real gap versus the brief's requirement — add a `server/security/turnstile.ts` adapter and call it from `guardPublicWrite` once keys exist.
- D1-backed rate limiting is a fixed-window approximation, not a true sliding-window/token-bucket. At the traffic volumes this portal expects it's adequate; if abuse patterns emerge, move to Durable Objects for a proper per-IP token bucket.

## Authorization

- Every admin mutation is gated by `requireStaff(request, permission)`, which resolves the session, checks the specific permission (not just "is staff"), and enforces CSRF. See `docs/AUTH_RBAC.md` for the full permission matrix.
- `assertCanManageTarget` prevents privilege escalation: a non-`super_admin` cannot create, edit, or suspend a `super_admin` account. `suspendStaffUser` additionally blocks self-suspension.
- Public read endpoints only ever query rows with `status='published'` (content) or `problemStatus='published' AND visibility='public'` (observatory) — draft/internal data has no code path to a public response. Verified by reading every public service function in `server/services/*` during this review; each public list/detail function hard-codes these filters rather than accepting them as a parameter.

## File uploads

- MIME type and size are allow-listed per media kind (`shared/contracts/media.ts`: `allowedMimeTypes`, `maxUploadBytes`) and enforced server-side in `signUpload` before any object key is issued.
- Upload flow is two-phase (sign → upload → confirm) so an asset only becomes publicly servable (`processingStatus='ready'`) after the server verifies the object actually landed in R2 (`bucket.head()`), preventing a client from registering a "ready" asset that was never actually uploaded.
- **Not yet implemented:** malware/antivirus scanning (`document_assets.scanStatus` field exists for this but nothing sets it beyond `'pending'`), and SVG sanitization (SVGs are not currently in the allow-list for images — only `png/jpeg/webp/gif` — so the "SVG-with-script" risk the brief calls out doesn't currently apply, but if SVG support is added later, sanitize before serving).
- Private/staff-only documents (`document_assets.downloadVisibility='staff'`) are correctly rejected from the public download endpoint, but there is no signed-URL mechanism yet for legitimate staff-only access from outside the admin session — add one before relying on `downloadVisibility='staff'` as an actual access control rather than a hint.

## Secrets

- No secret is committed anywhere in this repository. `.dev.vars` is gitignored; `.dev.vars.example` lists only variable **names**.
- `cloudflare-env.d.ts` documents every secret the Worker expects, with a one-line description of what it's for, so there's a single place to audit what secrets this Worker can read.

## What this implementation does not cover

- A full OWASP ASVS-level review (secure headers/CSP tuning, dependency scanning wiring, security-focused load testing) was out of scope for this pass — see `docs/OPERATIONS_RUNBOOK.md` "What was NOT run."
- Data retention windows for `assistant_messages`, `analytics_events`, `audit_logs`, and `rate_limit_events` are not yet enforced by any scheduled cleanup job — the tables exist, but nothing purges old rows. Add a retention sweep (e.g. via the same outbox/cron mechanism) before relying on this for GDPR-style data minimization commitments.
