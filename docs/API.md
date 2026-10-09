# API Reference — `/api/v1`

All new endpoints live under `/api/v1`. Legacy endpoints (`/api/content`, `/api/submissions`, `/api/chat`, `/api/media`, `/api/admin/*`) remain available unchanged as compatibility adapters until the frontend migrates — see `docs/FEATURE_BACKEND_MATRIX.md` for which screens still use them.

## Conventions

- **Envelope:** every response is `{ data, meta?, error?, requestId }`. On success `error` is `null`/absent. On failure `data` is `null` and `error` is an RFC 9457-flavoured object: `{ type, title, status, detail?, fieldErrors?, requestId }`.
- **Request IDs:** every response carries `requestId` in the JSON body and the `x-request-id` header. Pass your own `x-request-id` header to correlate client-side logs with server logs.
- **Locale:** `locale` query param is `ar` or `en`, default `ar`. Arabic and English content are never mixed in one list.
- **Pagination:** list endpoints are cursor-based (`cursor`, `limit`, response `meta.nextCursor`). `limit` is 1–50 (public) or 1–100 (admin), defaults vary by endpoint.
- **Validation:** every body/query is parsed with a Zod schema from `shared/contracts/*`. Failures return HTTP 400 with `error.fieldErrors` keyed by field path.
- **Auth:** staff endpoints require the `eladl_session` cookie (see `docs/AUTH_RBAC.md`). Mutating staff requests (anything but GET/HEAD) must also echo the `eladl_csrf` cookie value as an `x-csrf-token` header (double-submit CSRF defense).

## Public read endpoints

| Method | Path | Query params | Notes |
|---|---|---|---|
| GET | `/api/v1/home` | `locale` | Aggregated featured news/events/programs/initiatives/calls, published only. |
| GET | `/api/v1/content` | `type, locale, category, tag, featured, q, cursor, limit, sort` | Published content only. |
| GET | `/api/v1/content/:slug` | `locale` | Canonical detail + related items + breadcrumbs. 404 if unpublished/missing. |
| GET | `/api/v1/navigation` | `locale` | Public nav tree from `navigation_items`. |
| GET | `/api/v1/events` | `when (upcoming\|past\|all), locale, cursor, limit` | |
| GET | `/api/v1/events/:slug` | `locale` | |
| GET | `/api/v1/media` | `kind (image\|video\|document), q, cursor, limit` | Only `processingStatus=ready` R2-backed assets. |
| GET | `/api/v1/partners` | — | Published only. |
| GET | `/api/v1/team` | — | Published only; never includes unapproved names (see `docs/OFFICIAL_CONTENT_MAP.md`). |
| GET | `/api/v1/governorates` | — | Published only. |
| GET | `/api/v1/organization-structure` | — | Full org-chart tree. |
| GET | `/api/v1/observatory/problems` | `locale, cursor, limit` | Only `problemStatus=published AND visibility=public`. |
| GET | `/api/v1/observatory/problems/:slug` | `locale` | |
| GET | `/api/v1/observatory/solutions` | `locale` | |
| GET | `/api/v1/observatory/policies` | `locale` | |
| GET | `/api/v1/search` | `q (required, min 2 chars), locale, type, cursor, limit` | |
| GET | `/api/v1/faq` | `locale` | |

## Public write endpoints

All public write endpoints: validate with Zod, reject (silently, with a fake success) if the `website` honeypot field is non-empty, rate-limit by IP (10 requests / 10 min per endpoint unless noted), and never return internal staff data.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/intake/join` | name, email?, phone?, governorate?, profession?, body (≥20 chars), consent, participationType?, linkedin?, website (honeypot) | `{reference, status:"received"}` 201 |
| POST | `/api/v1/intake/volunteer` | …+ skills?, availability? | same |
| POST | `/api/v1/intake/ideas` | …+ field? | same |
| POST | `/api/v1/intake/problems` | …+ sector?, affectedGroup? | same — never auto-publishes to `/observatory/problems` |
| POST | `/api/v1/intake/proposals` | …+ reason? | same |
| POST | `/api/v1/contact` | base fields only | same |
| POST | `/api/v1/partnership-requests` | name, email, phone?, organizationName, proposal, requestedScope?, consent | `{reference, status:"received"}` 201 |
| POST | `/api/v1/events/:slug/registrations` | name, email, phone?, governorate?, answers?, consent | `{reference, status: pending\|confirmed\|waitlisted}` 201; 409 if window closed/duplicate |
| POST | `/api/v1/assistant/messages` | message, locale, contextPath?, sessionRef? | `{answer, citations[], source, sessionRef}`; rate-limited 20/min/IP |
| POST | `/api/v1/content/:slug/download` | — | `{url}`; 404 if no public document attached |

## Auth endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/magic-link` | `{email}` | Always 200; does not reveal whether the account exists. Rate-limited 5/15min/email. |
| POST | `/api/v1/auth/verify` | `{token}` | Sets `eladl_session` (HttpOnly) + `eladl_csrf` cookies. Token is one-time, 15-minute TTL. |
| GET | `/api/v1/auth/me` | — | `{authenticated, user}` — `user` includes resolved `roles`/`permissions`. |
| POST | `/api/v1/auth/logout` | — | Revokes the session server-side and clears both cookies. |

## Admin endpoints (staff session + permission required)

All admin endpoints require `requireStaff(request, permission)` — see `docs/AUTH_RBAC.md` for the permission catalogue. Every mutation writes an `audit_logs` row.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | `analytics.view` | Pending cases, scheduled content, upcoming registrations, recent activity, notification failures. |
| GET/POST | `/api/v1/admin/content` | `content.create` | List (any status/locale) / create draft. |
| GET/PATCH/DELETE | `/api/v1/admin/content/:id` | `content.create`/`content.update`/`content.delete` | DELETE archives published entries, hard-deletes drafts. |
| POST | `/api/v1/admin/content/:id/publish` | `content.publish` | Lifecycle transition: `submit_review\|approve\|request_changes\|publish\|unpublish\|schedule\|archive`. Validates required fields before `publish`/`schedule`. |
| GET | `/api/v1/admin/content/:id/revisions` | `content.create` | Revision history. |
| GET | `/api/v1/admin/intake` | `submission.view` | Case list with filters. |
| GET/PATCH | `/api/v1/admin/intake/:id` | `submission.view`/`submission.update` | Full case detail / status+priority+assignment+comment update. |
| POST | `/api/v1/admin/media/sign` | `media.upload` | Validates MIME/size, returns upload URL + pending asset id. |
| PUT | `/api/v1/admin/media/upload/:objectKey` | `media.upload` | Receives raw bytes, writes to R2. |
| POST | `/api/v1/admin/media/confirm` | `media.upload` | Verifies the R2 object landed, marks the asset `ready`. |
| DELETE | `/api/v1/admin/media/:id` | `media.delete` | Deletes from R2 + `storage_assets`. |
| GET/POST | `/api/v1/admin/knowledge` | `knowledge.manage` | List all / create draft FAQ entry. |
| PATCH | `/api/v1/admin/knowledge/:id` | `knowledge.manage` | `{action: "approve"\|"archive"}`. Approve queues assistant ingestion. |
| GET/POST | `/api/v1/admin/users` | `users.manage` | List staff + roles / invite or update roles. |
| POST | `/api/v1/admin/users/:id/suspend` | `users.manage` | Revokes sessions. Self-lockout and super_admin-protection enforced. |
| GET | `/api/v1/admin/roles` | `roles.manage` | Fixed role catalogue. |
| GET/POST | `/api/v1/admin/settings` | `settings.manage` | Allow-listed key/value settings only. |
| GET | `/api/v1/admin/audit-logs` | `audit.view` | Filterable by `entityType`, cursor-paginated. |
| GET/POST | `/api/v1/admin/partners` | `partners.manage` | |
| PATCH | `/api/v1/admin/partners/:id` | `partners.manage` | |
| GET/POST | `/api/v1/admin/team` | `content.create` | |
| PATCH | `/api/v1/admin/team/:id` | `content.update` | |
| GET/POST | `/api/v1/admin/governorates` | `content.create` | Upsert by governorate name. |
| POST | `/api/v1/admin/events` | `events.manage` | Creates `content_entries` + `events` rows together. |
| PATCH | `/api/v1/admin/events/:id` | `events.manage` | Status/capacity/registration-window updates. |
| GET | `/api/v1/admin/events/:id/registrations` | `events.manage` | Exportable list; every call is audit-logged. |
| GET/POST | `/api/v1/admin/programs/:entryId/details` | `programs.manage` | Typed program fields joined to a content entry. |
| GET/POST | `/api/v1/admin/opportunities/:entryId/details` | `opportunities.manage` | Typed opportunity fields joined to a content entry. |
| GET | `/api/v1/admin/observatory/problems` | `observatory.manage` | All statuses/visibilities. |
| PATCH | `/api/v1/admin/observatory/problems/:id` | `observatory.manage` | Moderation: status/visibility/severity/confidence. |
| POST | `/api/v1/admin/observatory/problems/:id/evidence` | `observatory.manage` | Attach a citation/source. |
| POST | `/api/v1/admin/jobs/drain` | `settings.manage` | Manually drains the notification/search-index/knowledge-ingest outbox and runs the scheduled-publish sweep. See `docs/OPERATIONS_RUNBOOK.md` for why this is manual. |

## Error codes

| Status | Meaning |
|---|---|
| 400 | Validation failure — see `error.fieldErrors` |
| 401 | No/expired/invalid staff session |
| 403 | Session lacks the required permission |
| 404 | Resource not found or not public |
| 409 | Conflict — slug taken, duplicate registration, invalid lifecycle transition, CSRF mismatch |
| 429 | Rate limited |
| 500 | Unexpected server error (never leaks stack traces/SQL) |
| 503 | A required binding (R2) is not provisioned for this environment |
