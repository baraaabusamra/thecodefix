# AWS Track — `create-new-track` Build Verification

**Date:** 2026-08-14 · **Track:** AWS Cloud Foundations (33 lessons) · **Result:** ✅ **PASS** ·
**Published:** ❌ NO (local verification only — no push/deploy)

This records the sanctioned `create-new-track` §5 mandatory build check for the completed AWS track,
run per instruction ("run the sanctioned create-new-track process and the full npm run build
verification, but still do not push or deploy").

## What was run

1. **Staged** the 33 AWS draft lessons + `_meta.json` from `content/wave-1-drafts/aws/` into
   `content/ar/tracks/aws/` (the location the content loader reads).
2. **Pre-flight:** checked for duplicate `order` values (a create-new-track §5 failure mode) →
   **33 distinct orders, no duplicates**.
3. **Built:** `DATABASE_URL="" npm run build`.
   - `DATABASE_URL` was forced empty to isolate the **file-based content rendering path** (the path
     AWS content uses) from the DB/network. With no DB, `content.ts` loads file-only content — the
     exact pipeline that renders the AWS `.mdx` files through `modules/learning/src/ui/Mdx.tsx`.

## Result

```
▲ Next.js 16.2.11 (Turbopack)
✓ Compiled successfully in 25.3s
  Finished TypeScript in 11.7s   (no type errors)
  Generating static pages ... (3752/3752)
EXIT_CODE: 0
```

- **Exit code 0**, zero errors.
- **All 3,752 static pages generated**, including the 33 new AWS pages under `/learn/aws/*` (the
  `/learn/[tech]/[lesson]` route's `generateStaticParams` picked up the `aws` file track). Any MDX
  render/JSX error on an AWS page would have failed static generation — none did.
- This is a stronger check than the per-page `@mdx-js/mdx` compile used during production: it renders
  every AWS page through the full app (route, `Mdx.tsx` components, `rehype`/`remark` plugins,
  metadata) alongside the existing 34 tracks.

### Notes / caveats (honest)

- Pre-existing, unrelated warning: Next detected **multiple lockfiles** (`C:\Users\abusamra\package-lock.json`
  vs the repo's) — a workspace-root warning, not an AWS-content issue.
- The build ran with the DB disabled (file-only). A production build with the DB additionally merges
  CMS/DB content; that path is orthogonal to the file-based AWS lessons, which is what this check
  targets.

## After verification — reverted

`content/ar/tracks/aws/` and the build log were **removed**; the repo is back to its
pre-verification state (`content/ar/tracks/` untouched, HEAD `ebb2d10`, nothing committed). The 33
AWS lessons remain staged in `content/wave-1-drafts/aws/`. Unreviewed content — including the 4 IAM
security pages — is deliberately **not** left in the live content directory.

## Publish gates — still ALL OPEN (nothing is live)

| Gate | Status |
|---|---|
| Content complete | ✅ 33 lessons |
| Build verification (this doc) | ✅ pass |
| 🔒 Security review — 4 IAM pages (`005/018/034/036`) | ⏳ pending human specialist |
| 👤 Human review — all 33 AWS pages (incl. CLI tutorials with commands not run against live AWS) | ⏳ pending |
| Push / deploy (go-live) | ⏳ human action, not taken |

The build check proves the content **compiles and renders**; it does **not** clear the review or
deploy gates. Going live remains a human decision after review.
