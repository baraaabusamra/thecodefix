# Backup and restore runbook

**Status:** procedure documented locally on 2026-09-05. A restore drill has not
yet been executed. Never test a restore against the production branch.

## Scope and ownership

This runbook covers:

- Neon Postgres schema and data.
- Git-tracked application and editorial content.
- Raw curriculum documents stored outside Git (currently Vercel Blob) whose URLs
  are referenced by database rows.

The project owner owns retention, access, and the quarterly drill. A second
trusted operator should be able to complete the procedure without relying on the
original developer's machine. Target recovery objectives are **RPO 24 hours** and
**RTO 4 hours** until real drill measurements justify tighter values.

## Backup policy

### Neon Postgres

1. In Neon, record the production project, root branch, configured restore
   window, plan limits, and the two people allowed to restore it. Configure the
   longest affordable point-in-time history; do not assume a plan default.
2. Enable scheduled snapshots where the current Neon plan supports them. Keep at
   least seven daily and four weekly recovery points when the plan permits it.
3. Once per day, create an independent encrypted custom-format dump with the
   matching major-version `pg_dump`. Load connection fields from the approved
   secret manager into libpq environment variables; never paste a connection URL
   or password into a command committed to Git or saved in shell history.

```powershell
$backupDir = "D:\thecodefix-backups\postgres"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpPath = Join-Path $backupDir "thecodefix-$stamp.dump"

# Before this command, set PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD
# from the approved secret store for a direct/unpooled, read-only backup role.
pg_dump --format=custom --no-owner --no-acl --file="$dumpPath"
Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
```

4. Copy the encrypted dump and its SHA-256 checksum to storage in a different
   failure domain/account. A file on the production provider or one laptop is not
   an independent backup.
5. Never log or commit database URLs, passwords, dump contents, or row samples.

### Git and content assets

- `src/content/`, source code, migrations, and operational docs are protected by
  the Git remote only after the intended commits are pushed. Mirror the private
  repository weekly to an independently controlled private remote or encrypted
  archive.
- Verify a Git archive with `git bundle verify` before counting it as a backup.
- Export raw Vercel Blob curriculum documents plus a manifest containing object
  pathname, source database ID, checksum, and backup date. Store the encrypted
  copy outside Vercel. Database dumps preserve Blob URLs, not the Blob bytes.
- Keep credentials and local tooling directories out of every archive intended
  for sharing.

## Quarterly restore drill — isolated target only

1. Record the incident/drill ID, operator, chosen recovery timestamp, expected
   production database identity, and expected row counts before doing anything.
2. Prefer Neon's preview/temporary branch restore first. Point-in-time restore is
   valid only inside the configured retention window. Do not finalize an in-place
   production restore during a drill.
3. For the independent dump path, create a brand-new empty Neon test project or
   isolated empty database. Confirm its exact host/project/branch in the console
   and with `SELECT current_database(), inet_server_addr();`. Stop immediately if
   any value matches production.
4. Set libpq environment variables for that isolated destination, then restore:

```powershell
pg_restore --no-owner --no-acl --exit-on-error --single-transaction `
  --dbname="$env:PGDATABASE" "D:\thecodefix-backups\postgres\thecodefix-YYYYMMDD-HHMMSS.dump"
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
```

5. Validate the restored schema and representative critical records without
   copying personal row values into the drill report:

```sql
SELECT current_database(), inet_server_addr();
SELECT count(*) FROM "user";
SELECT count(*) FROM subscription;
SELECT count(*) FROM user_progress;
SELECT count(*) FROM certificate;
SELECT count(*) FROM creator;
SELECT count(*) FROM post;
SELECT count(*) FROM academic_study_plan;
SELECT count(*) FROM pipeline_document;
```

6. Connect a local/preview deployment to the isolated database and run
   `run-ci.cmd`. Smoke-test sign-in, lesson progress, certificates, creator pages,
   and admin read-only views. Do not send emails, Stripe requests, or notifications
   from the drill environment.
7. For every Blob manifest entry sampled, verify the checksum and that the object
   can be restored to a non-production bucket/store.
8. Record start/end time, selected recovery point, checksum, row-count comparison,
   failures, measured RPO/RTO, and corrective owner/date. Delete temporary cloud
   resources only after the owner reviews the evidence.

## Real incident decision path

- **Bad deploy, data intact:** roll back application code; do not restore the DB.
- **Recent accidental data/schema change:** use Neon Time Travel/point-in-time
  restore to a preview branch, verify the exact timestamp and data, then obtain
  explicit owner approval before any production finalization.
- **Provider-level loss or recovery point outside Neon retention:** restore the
  latest verified independent dump and Blob archive into a new environment, run
  validation, then switch the application only after owner approval.
- Preserve the pre-restore state and incident evidence until postmortem closure.

## Evidence template

| Field | Value |
|---|---|
| Drill/incident ID | TBD |
| Operator + reviewer | TBD |
| Source recovery timestamp | TBD |
| Destination project/branch | TBD — must be non-production for drills |
| Dump SHA-256 | TBD |
| Restore started / completed | TBD |
| Measured RPO / RTO | TBD |
| Schema and row-count validation | TBD |
| Application smoke test | TBD |
| Blob sample validation | TBD |
| Findings, owner, due date | TBD |

## References

- [Neon branching and recovery overview](https://neon.com/docs/guides/branching-intro)
- [Neon database versioning with snapshots](https://neon.com/docs/ai/ai-database-versioning)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
