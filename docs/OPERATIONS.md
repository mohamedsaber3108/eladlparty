# Content and deployment operations

## Environment

Set `ADMIN_TOKEN` as a long random secret in the deployed environment. Never commit it. The administrative UI sends it as `x-admin-token` only to the protected administration APIs.

## Data

The D1 schema and immutable migrations live in `db/schema.ts` and `drizzle/`. `portal_content` is the source of truth for news, events, programmes, initiatives, reports, policies, opportunities and other publishable records. Tables also exist for submissions, media records, assistant knowledge and administrative users.

## Publishing content

1. Open `/admin` and enter the configured administration token.
2. Select the relevant module.
3. Create a draft, review it, then select `published` when it is ready for the public portal.
4. Add a concise excerpt and full body; the list and the detail page read the same record.

## Assistant knowledge

Add approved question/answer entries through the Knowledge module. The assistant checks the published knowledge base first, then gives controlled guidance for common portal tasks. It does not invent party positions.

## Local run

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:generate
pnpm build
pnpm start
```
