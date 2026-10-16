---
name: audit-security
description: Scan The Code Fix for security problems (secrets, missing auth on Server Actions/API routes, XSS, SQL, open redirects, CSP, vulnerable npm packages) with a deterministic script, then verify only the flagged lines. Use for "security check", "فحص أمني", before merging a branch, or after touching modules/*/src/actions/*.ts, apps/web/src/app/api/**, packages/identity, or package.json.
---

# Audit — Security

A script does the searching; you only verify. Never read whole files or the whole JSON — that is what this skill exists to avoid.

## 1. Run the scanner (≈5s, zero tokens)

```bash
node scripts/audit/scan-security.mjs --out audit-out/main/security.json
# one branch / a set of files only:
git diff --name-only main...HEAD > /tmp/changed.txt
node scripts/audit/scan-security.mjs --files /tmp/changed.txt --no-npm-audit --out audit-out/local/security.json
```

## 2. Read the compact summary, not the JSON

```bash
node scripts/audit/build-map.mjs >/dev/null   # refresh map.json
node scripts/audit/where.mjs --summary --rule SEC- --min medium --top 40
```

## 3. Verify each finding at its line only

For every `confidence: verify|likely` item, open ±15 lines around `file:line` (Read with offset/limit). Decide:

| Rule | It is a real problem when… | It is fine when… |
|---|---|---|
| SEC-AUTH-MISSING | the action writes/reads private data and nothing up the call chain checks `auth()` / `resolveAdmin()` + `can()` / an `assert*()` guard | public by design (sign-up, job alert) **and** rate-limited, or a no-op stub |
| SEC-RATELIMIT | public endpoint that writes data | it is authenticated |
| SEC-XSS | the HTML comes from users/DB/MDX without sanitising | constant string, or `JSON.stringify(...).replace(/</g, …)` |
| SEC-SQL-RAW | `sql.raw()` receives anything request-derived | constant identifiers only |
| SEC-OPEN-REDIRECT | target comes from the request and isn't checked to start with `/` (and not `//`) | allow-listed / relative-only |
| SEC-SECRET in `content/**` | looks like a live provider key | obvious teaching placeholder |
| SEC-DEPENDENCY | the vulnerable path is reachable in production (`npm ls <pkg>`) | dev-only tool |

Server Actions are public HTTP endpoints — "only the admin UI calls it" is not protection.

## 4. Report

Per confirmed finding: severity, `file:line`, one-sentence impact, the concrete fix. Put false positives in a short "checked, fine" list so they're not re-checked. Do not paste secret values — name the file and line only.

If the scanner's heuristic was wrong, improve `scripts/audit/scan-security.mjs` (it is the shared source of truth) rather than memorising the exception.

## Guardrails

- Do not change auth, RBAC, schema or env vars as part of an audit — report first (docs/repository-audit README: discovery before refactor).
- A real secret found in git history must be rotated at the provider; deleting the line is not enough.
