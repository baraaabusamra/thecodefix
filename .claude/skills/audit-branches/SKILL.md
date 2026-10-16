---
name: audit-branches
description: Sweep every branch that has commits not in main — classify it (already in main / merges cleanly / conflicts / unrelated) and run the security, code and content scanners on just the files it changed. Use for "افحص كل الفروع", branch cleanup, or deciding what to merge before V2.
---

# Audit — All unmerged branches

## 1. Run (≈2–4 min for ~55 branches, zero model tokens)

```bash
node scripts/audit/scan-branches.mjs                 # all branches vs main
node scripts/audit/scan-branches.mjs --only a,b,c    # specific branches
node scripts/audit/build-map.mjs                     # put results on the map
```

Per branch it fetches (depth 60), finds the merge-base, and classifies by trying the branch's own patch against main:

| status | meaning | usual action |
|---|---|---|
| `in-main` | its changes already exist in main (squash / cherry-pick) | safe to delete |
| `unique-applies` | real work, applies cleanly | review → PR |
| `unique-conflicts` | real work, main moved on | rebase, or re-apply by hand if small |
| `unrelated` | no common history with main (or deeper than 60) | inspect manually |

tsc/eslint only run when the branch changed `.ts/.tsx`; `npm audit` only when it changed `package*.json`; `check:all` always (2s).

## 2. Read results

```bash
node -e "const s=require('./audit-out/branches/summary.json');for(const b of s.branches)console.log(b.status.padEnd(17),b.branch,JSON.stringify(b.totals||{}))"
node scripts/audit/where.mjs --summary --branch <name> --top 30
```

## 3. Decide per branch

1. Any 🟥/🔴 finding → must be fixed on the branch before merge.
2. `unique-conflicts` content refreshes of the same track on several dates (e.g. `css-refresh-2026-08-31`, `-09-07`, `-09-14`) usually supersede each other — compare the newest one with main first; older ones are often obsolete.
3. Never delete a branch without the owner's OK; list candidates instead.
