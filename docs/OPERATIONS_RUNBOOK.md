# Operations Runbook

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars        # set ADMIN_TOKEN (legacy adapter) + SESSION_SECRET (required for new auth)
pnpm db:migrate:local                 # applies all drizzle/*.sql migrations to the local D1 (Miniflare) instance
pnpm bootstrap:admin:local --email you@example.com   # creates your super_admin account
pnpm build
pnpm start                            # wrangler dev --local, serves the built Worker
```

Then: request a magic link via `POST /api/v1/auth/magic-link {"email":"you@example.com"}`. Since no `EMAIL_PROVIDER` secret is set locally, the link is **logged to the console** (`[email-adapter] EMAIL_PROVIDER not configured...`) rather than emailed — copy the token out of the dev server log and call `POST /api/v1/auth/verify {"token":"..."}` to get a session.

## What was verified during this implementation

- `pnpm db:generate` — schema matches migrations, no pending diff (60 tables).
- `wrangler d1 migrations apply site-creator-d1 --local` — all 6 migrations (`0000`–`0005`) applied cleanly to a **fresh, empty** local D1 database. Confirmed `sqlite_master` reports 60 application tables afterward.
- `node scripts/bootstrap-admin.mjs --email test-admin@example.com --local` — ran successfully; confirmed via `SELECT u.email, r.key FROM users u JOIN user_roles ur ... JOIN roles r ...` that the role was correctly assigned.
- `pnpm build` — full 5-stage vinext/Vite build (client references, server references, RSC, client, SSR) succeeds with zero errors, producing a route table that includes every legacy and new `/api/v1/*` endpoint.
- `tsc --noEmit` — all new `server/`, `shared/`, and `app/api/v1/**` code is typecheck-clean. (A handful of pre-existing type errors remain in old frontend components — `admin-dashboard.tsx`, `chat-assistant.tsx`, `content-browser.tsx`, `dynamic-detail.tsx`, `media-gallery.tsx`, `submit-form.tsx` — these predate this change and are unrelated to the backend work.)

## What was NOT run (and why)

- **Unit/integration/contract/E2E test suite** — none exists in this repository yet (no test runner is configured in `package.json`). The brief's quality gates (§11) call for this; it is a real gap. Standing one up (Vitest for unit/integration, Playwright for E2E) is the natural next phase but was out of scope for this pass given the size of the schema/API work already delivered — flag this explicitly rather than claiming test coverage that doesn't exist.
- **Load/rate-limit/security penetration testing** — requires a deployed environment and dedicated tooling; not something to simulate meaningfully against a local Miniflare instance.
- **Backup/restore drill against production D1** — requires a provisioned production database; the current `.openai/hosting.json` has a placeholder database id.

## Draining background jobs

Notifications, search re-indexing, and assistant knowledge ingestion are recorded in `outbox_jobs` (D1-backed, since no Cloudflare Queues binding is provisioned — see Known Gaps in `docs/FEATURE_BACKEND_MATRIX.md`). Nothing processes them automatically yet. Until a Cron Trigger is added to this project's Cloudflare configuration, call:

```http
POST /api/v1/admin/jobs/drain
```

(requires `settings.manage` permission) manually, or wire it into an external scheduler (e.g. a GitHub Actions cron hitting this endpoint with a staff session, or a Cloudflare Cron Trigger once `wrangler.jsonc`/the hosting control plane supports `[triggers]` for this project).

This same call also runs the scheduled-content-publish sweep (promotes `content_entries` rows with `status=scheduled` whose `scheduledAt` has passed).

## Database migrations

- Forward-only. Never edit a committed migration file. Run `pnpm db:generate` after changing `db/schema.ts`, review the generated SQL in `drizzle/`, commit it, then apply with `pnpm db:migrate:local` / `pnpm db:migrate:remote`.
- The 6 current migrations are additive only — no existing columns were altered or dropped. The 6 original trial-era tables (`submissions`, `content`, `portal_content`, `media_assets`, `knowledge_entries`, `admin_users`) are untouched and continue to back the legacy `/api/*` compatibility routes.

## Rollback

Cloudflare Workers deploys are immutable and support instant rollback to the previous deployment via the dashboard or `wrangler rollback`. D1 migrations are forward-only by design (per the brief), so a schema rollback means writing a new forward migration that reverts the change, not editing history. Keep a daily D1 export (`wrangler d1 export`) before any migration that touches existing data, not just new tables.

## Health checks

There is no dedicated `/health` endpoint yet. `GET /api/v1/home` with a short timeout is a reasonable smoke-test proxy (it touches D1, two services, and returns within the normal request budget) until a dedicated endpoint is added.
