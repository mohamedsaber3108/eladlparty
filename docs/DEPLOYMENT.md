# Deployment Guide

## Prerequisites

1. A Cloudflare account with Workers + D1 enabled, and (for media uploads) an R2 bucket.
2. `wrangler login` run locally, or the hosting control plane's own deploy pipeline configured with Cloudflare API credentials.
3. `.openai/hosting.json` updated with the real `d1` binding name (already `"DB"`) and, once provisioned, the `r2` binding name (currently `null`).

## Environments

`development` (local Miniflare), `staging`, `production` — per the brief §10. This repository currently only has local dev wired; staging/production environments should be defined as separate D1 databases + separate secret sets, promoted through the same migration path.

## Secrets (set via the hosting platform, never committed)

| Secret | Required for | Notes |
|---|---|---|
| `SESSION_SECRET` | Staff auth | Long random string. Rotating it invalidates all active sessions. |
| `PUBLIC_BASE_URL` | Magic-link emails | e.g. `https://eladl.party` |
| `EMAIL_PROVIDER` | Transactional email | `"resend"` is the only adapter implemented; omit to keep the safe logging no-op. |
| `EMAIL_API_KEY`, `EMAIL_FROM` | Transactional email | Required together with `EMAIL_PROVIDER=resend`. |
| `TURNSTILE_SECRET_KEY` | Public form bot protection | Declared but not yet verified by any route — see `docs/SECURITY.md`. |
| `AI_PROVIDER_API_KEY` | Richer assistant answers | Declared but unused — assistant currently answers from approved knowledge only, by design. |
| `ADMIN_TOKEN` | Legacy adapter only | Keep only while the frontend still calls `/api/admin/*`; remove once migrated to session-based admin auth. |

`.dev.vars.example` lists these for local development (`.dev.vars` itself is gitignored).

## Build & deploy

```bash
pnpm install
pnpm build          # vinext/Vite build → dist/
# apply migrations to the target D1 BEFORE promoting traffic to the new build:
pnpm db:migrate:remote
# deploy via your Cloudflare Workers deploy pipeline (wrangler deploy or the hosting
# control plane's own mechanism — this project's dist/server/wrangler.json is generated
# by the build and consumed by that pipeline, not hand-edited)
```

## Smoke test after every deploy

1. `GET /` — public home renders.
2. `GET /en` — English shell renders.
3. `GET /api/v1/home` — returns `200` with `data.news`/`data.events` arrays (empty is fine, errors are not).
4. `GET /api/v1/auth/me` — returns `{authenticated: false, user: null}` for an anonymous request.
5. If this deploy included a migration: confirm `pnpm db:migrate:remote` reported success for every new migration file before step 1–4.

## Rollback

See `docs/OPERATIONS_RUNBOOK.md` → Rollback. Cloudflare Workers deploys roll back instantly; D1 schema changes do not — plan migrations to be backward-compatible with the previous Worker version for at least one deploy cycle (additive columns, not renames/drops) so a Worker rollback never points at a schema the old code doesn't understand. Every migration generated in this implementation is additive-only for exactly this reason.

## R2 and Queues provisioning (follow-up, not yet done)

- Create an R2 bucket, bind it as `BUCKET` in the Worker config, and set `.openai/hosting.json`'s `r2` key to `"BUCKET"`. `server/storage/r2-storage.ts` will then stop returning 503 for all media endpoints.
- For true queue-backed background jobs (instead of the current D1 outbox + manual drain), add a Cloudflare Queue, bind a producer/consumer, and replace `server/jobs/outbox.ts`'s `enqueueOutboxJob`/`drainOutbox` with queue `send()`/a scheduled consumer — the `OutboxHandlers` interface in `server/jobs/handlers.ts` is already shaped to drop into a queue consumer with no changes to the handler logic itself.
