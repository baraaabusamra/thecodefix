# Deployment and database migrations

Production is promoted **only** after its database is at the schema the new
code expects. The order is fixed:

```
PR (CI green) → merge to main → "Deploy production" workflow:
  1. validate   npm ci + npm run ci           (same standard as PR CI)
  2. migrate    npm run db:migrate:deploy -- --confirm   (transactional)
  3. verify     npm run db:verify             (no pending / unknown migrations)
  4. deploy     vercel build --prod + vercel deploy --prebuilt --prod
```

Any failure stops the run; later steps never execute.

## Guarantees

| Requirement | How |
|---|---|
| Migration before promotion | `deploy` job `needs: migrate`; Vercel's automatic production deploys from Git are disabled (one-time setup below). |
| Failed migration stops rollout | Non-zero exit from `db:migrate:deploy` / `db:verify` fails the job. |
| No partial schema | `scripts/db-migrate.mjs` uses the Neon **WebSocket** driver; Drizzle applies all pending migrations in **one transaction** (`PgDialect.migrate`). Proven by `tests/migrations-gate.test.mjs` (a broken migration rolls back the good one before it). The HTTP driver has no transactions, so `scripts/migrate-http.mjs` now refuses without `--allow-non-transactional`. |
| Explicit execution | `--confirm` required; the runner refuses inside any Vercel build (`VERCEL=1`), so preview deployments can never migrate. |
| No silent destructive change | Pending migrations containing DROP / TRUNCATE / DELETE FROM / column type change / RENAME / SET NOT NULL are refused unless the tag is passed in `ALLOW_DESTRUCTIVE_MIGRATIONS` (workflow input `allow_destructive`) after human review. |
| Committed migrations are immutable | `drizzle/migrations.lock.json` stores each migration's hash; `npm run check:migrations` (part of `npm run ci`) fails if an existing migration is edited, deleted, or a stray file appears. |
| Credentials never reach PR code | Only the manual `Deploy production` workflow, in the protected `production` environment, receives `DATABASE_URL_UNPOOLED` / Vercel secrets. `ci.yml` uses no secrets. |

## Adding a migration

1. Change `src/db/schema.ts`.
2. `npx drizzle-kit generate --name=<short-description>` (offline).
3. Review the SQL. Prefer additive changes (new tables/columns/indexes, nullable
   columns, defaults). Never edit an existing migration.
4. `npm run db:lock-migrations` — records the new file's hash.
5. Commit schema, SQL, `drizzle/meta/*`, and `migrations.lock.json` together.

## One-time setup

1. GitHub → Settings → Environments → **production**: add required reviewers;
   add secrets `DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`.
2. Run the workflow once (it will validate, apply any pending migrations, and
   deploy) to confirm the secrets work.
3. Only then disable Vercel automatic production deployments for `main`
   (Vercel → Project → Settings → Git, or add to `vercel.json`:
   `{ "git": { "deploymentEnabled": { "main": false } } }`). Preview
   deployments for other branches keep working and never migrate.

Until step 3 is done, Vercel still auto-deploys `main` on push, so the gate
is **not yet enforced**: run the workflow's migrate job (or
`npm run db:migrate:deploy -- --confirm` locally) *before* merging a PR that
contains a migration.

## Emergency / manual

- Status: `npm run db:verify` (needs `DATABASE_URL_UNPOOLED`).
- Manual apply: `npm run db:migrate:deploy -- --confirm`.
- A destructive migration: schedule a maintenance window if it can break the
  running (old) code, then run the workflow with `allow_destructive=<tag>`.
