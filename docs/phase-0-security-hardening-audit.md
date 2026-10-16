# Phase 0 Operational-Hardening Audit — Rate Limiting, Error Monitoring, CSP

**Date:** 2026-09-05 · **Method:** read-only static audit of the current tree (no builds, no installs, no deploys). Prior docs (`architecture-review.md`, `ROADMAP.md`) were used only to locate context; every claim below was re-verified directly against the code cited, since prior reports may be stale.
**Scope:** the three remaining Phase 0 operational-hardening items — (1) rate limiting on checkout/suggestions/public writes, (2) production error monitoring & alerting, (3) CSP Report-Only readiness. Admin-gated surfaces (`apps/web/src/app/admin/**`) are out of scope: they sit behind RBAC + auth and are a different threat model.

## Implementation follow-up — 2026-09-05

The audit findings below were the pre-implementation snapshot. The following
remediation is now complete in the local working tree and has not been deployed:

- All listed creator, progress, and notification write gaps now use the shared
  limiter. Registration entry points share one per-user key; high-frequency
  progress and notification writes use a generous 60/minute backstop. The
  expensive public certificate-OG route also gained a 60/minute per-IP guard.
- The existing 30-second database-backed creator-submission cooldown remains in
  place as a product rule in addition to the shared limiter.
- Next.js `onRequestError`, apps/web/public/admin/global error boundaries, structured
  redacted logs, an optional alert webhook, and explicit Stripe/checkout capture
  are implemented. Alert delivery remains inactive until
  `ERROR_ALERT_WEBHOOK_URL` is configured in production.
- CSP is implemented as non-blocking `Content-Security-Policy-Report-Only` with
  both modern and legacy reporting, plus a size-limited, rate-limited collector.
  Enforcement still requires the observation window and owner decision described
  below.
- Permanent regression coverage lives in
  `tests/operational-hardening.test.mjs` and
  `tests/rate-limit-public-writes.test.mjs`; both are wired into `run-ci.cmd`.

The sections below retain the original evidence and rollout reasoning. Statements
describing a gap as "current" should be read as the state at audit time, before
the follow-up above.

## Initial verdict (pre-implementation snapshot)

Rate limiting was **already substantially implemented** (commit `6d35fcb`, "rate-limit public server actions") — a shared `packages/core/src/rate-limit.ts` helper was wired into 7 of the 15 non-admin write surfaces. The remaining gap was a specific, enumerable list of 8 endpoints, mostly the creator-content family. Error monitoring was **not implemented at all** (zero packages, no `instrumentation.ts`, no `error.tsx`). CSP was **not implemented at all** (no `Content-Security-Policy` header of any kind, Report-Only or enforced), though the codebase was close to Report-Only-ready.

---

## 1. Rate limiting

### 1.1 What's already covered (verified in code, no action needed)

`packages/core/src/rate-limit.ts` — in-memory sliding-window limiter (`rateLimit(key, max, windowMs)`) plus `getClientIp()` (reads `x-forwarded-for`/`x-real-ip`). It is a per-instance, best-effort limiter (resets on cold start, not shared across instances) — an accepted tradeoff already documented in its own header comment, not a new finding.

Confirmed wired in:

| Endpoint | File | Key | Limit |
|---|---|---|---|
| `submitSuggestion` | `modules/feedback/src/actions/suggest.ts:31` | `suggest:<ip>` | 5 / 10 min |
| `POST /api/checkout` | `apps/web/src/app/api/checkout/route.ts:40` | `checkout:<userId>` | 5 / min |
| Lesson quiz start/submit | `modules/assessment/src/actions/lesson-quiz.ts:52,152` | `lesson-quiz-*:<userId>` | 30 / min |
| Track exam start/autosave/submit | `modules/assessment/src/actions/exam.ts:112,247,292` | `exam-*:<userId>` | 10–120 / min |
| Certificate record/secure-issue | `modules/certificates/src/actions/certificate.ts:45,164` | `cert*:<userId>` | 10 / min |
| Job-alert subscribe | `modules/jobs/src/actions/alerts.ts:29` | `job-alert:<ip>` | 5 / 10 min |

Keying is consistent with risk: anonymous/pre-auth endpoints key on IP, authenticated endpoints key on `userId`. This pattern should be reused as-is for the gaps below — no new abstraction needed.

### 1.2 Gaps found (verified absent)

Grepped every non-admin `actions.ts`/`route.ts` under `apps/web/src/app` for `rateLimit(`; these do not call it:

| # | Endpoint | File | Auth | Why it matters |
|---|---|---|---|---|
| 1 | `registerCreator` | `modules/creators/src/actions/register.ts` | session required | Creates a `creators` row. Multiple pages per user are an intentional product feature (`modules/creators/src/creators.ts` documents personal + brand/company pages), so a unique constraint would be incorrect; the actual gap was unbounded creation cost and display-name probing. |
| 2 | `POST /api/creators` | `apps/web/src/app/api/creators/route.ts` | session required | Duplicate entry point to the same write as #1. It must share the exact same per-user key and budget so alternating entry points cannot bypass the guard. |
| 3 | `submitVideo` | `modules/creators/src/actions/submit.ts` | session + ownership check | Uses a **bespoke DB-query cooldown** (lines 13-16, 85-96: selects the creator's last post, compares `createdAt`) instead of the shared limiter. The comment at line 13-15 ("no rate-limiting utility exists in this codebase yet") **predates `packages/core/src/rate-limit.ts` and is now stale** — this is a second, inconsistent implementation of the same concern, plus an extra DB round-trip on every submit. |
| 4 | `deleteOwnPost` | `modules/creators/src/actions/submissions.ts` | session + ownership check | No cooldown at all. Cheap DB write + 3× `revalidatePath` per call (line 25-27) — repeated calls also mean repeated cache invalidation, a secondary cost beyond the DB write. |
| 5 | `updateOwnPost` | `modules/creators/src/actions/edit-post.ts` | session + ownership check | No cooldown at all. |
| 6 | `updateOwnCreatorProfile` | `modules/creators/src/actions/edit-profile.ts` | session + ownership check | No cooldown at all. |
| 7 | `saveMyProgress` | `modules/progress/src/actions/progress.ts:85-104` | session required | Called on every lesson-completion toggle by design (high legitimate frequency), so a strict per-minute cap would need to be generous. `architecture-review.md` §B3 already recommends a client-side debounce for cost reasons; a *generous* backstop limit (e.g. 60/min) closes the abuse case without touching the legitimate-use curve. |
| 8 | `POST /api/notifications/read` | `apps/web/src/app/api/notifications/read/route.ts` | session required | No cooldown. Lowest severity here — one row, own-notification-only, idempotent — but it's a public POST endpoint reachable by any signed-in user with no guard at all. |

**Risk ranking at audit time:** #1/#2 (unbounded creator-registration cost across two entry points) > #3 (inconsistent pattern, partially covered by a product cooldown) > #4/#5/#6 (authenticated, own-resource-only, but zero friction) > #7/#8 (self-scoped, idempotent-ish, lowest impact).

Everything above requires an authenticated session — the OAuth providers are GitHub + Google (`packages/identity/src/auth.ts:22-23`), self-serve with no approval gate, so "authenticated" is a low bar, not a strong mitigant on its own.

**Explicitly out of scope / not a gap:**
- `POST /api/stripe/webhook` — gated by Stripe signature verification (`route.ts:97-102`), not a public write in the abuse sense; rate-limiting it would risk dropping legitimate retries.
- `POST /api/auth/[...nextauth]` — handled internally by Auth.js; not ours to rate-limit at this layer.
- All `apps/web/src/app/admin/**/actions.ts` — RBAC + auth gated, different threat model, out of the stated scope.

---

## 2. Production error monitoring & alerting

**Audit-time state: none.** Verified before the implementation follow-up above:
- No monitoring package in `package.json` (no `@sentry/*`, no equivalent).
- No `instrumentation.ts` / `instrumentation-client.ts` anywhere in the tree (Next 16's hook for `onRequestError` — the supported integration point for exactly this).
- No `apps/web/src/app/error.tsx`, no `apps/web/src/app/global-error.tsx`, no `apps/web/src/app/admin/error.tsx`. Only `apps/web/src/app/not-found.tsx` exists. A production render error today falls through to Next's default generic error screen with nothing captured anywhere.
- Errors are handled with bare `console.error` in 6 files, which only reach Vercel's function logs — nobody is paged; someone has to think to go look. Most consequential instance: `apps/web/src/app/api/stripe/webhook/route.ts:41,49,100,133` — a systematic failure here (bad `DATABASE_URL`, expired webhook secret, schema drift) silently desyncs Pro subscription status from what customers paid for, with zero alerting.
- This is already self-identified: `docs/ROADMAP.md:129` lists "بلا مراقبة أخطاء | Sentry (أو Vercel Agent) لأخطاء الإنتاج" ("no error monitoring | Sentry (or Vercel's built-in observability) for production errors") under its infra backlog — the code confirms this is still true today, not stale.

**Risk ranking:** highest — this isn't a vulnerability, but every other Phase 0 item (and every future incident) is diagnosed blind without it. The Stripe webhook silent-failure path is the single most consequential instance because it's a money/entitlement-correctness issue, not just a UX one.

### Recommended shape (no vendor chosen — see §5)

1. **`apps/web/src/instrumentation.ts`** (new) — `register()` + `onRequestError(err, request, context)` hook. This is Next's standard capture point for uncaught errors in Server Components, Route Handlers, and Server Actions; whichever provider is picked (Sentry, or Vercel's own Observability/Log Drains), this is where it plugs in. Needs zero per-route edits — it's a global hook.
2. **`apps/web/src/app/error.tsx`** (new) — client error boundary for the public app; Arabic RTL, matches brand ("حدث خطأ غير متوقع" + retry via `reset()` + link home) — this was already scoped in `architecture-review.md` §C1 and is still absent.
3. **`apps/web/src/app/global-error.tsx`** (new) — catches errors thrown from the root layout itself (the one case `error.tsx` can't catch).
4. **`apps/web/src/app/admin/error.tsx`** (new) — same recovery shape and a stable incident/reference ID, but never render the raw thrown message. Admin-only pages still process database/provider errors whose text can contain operational details; role-gating does not make raw exception text safe to disclose.
5. **Explicit capture on the one business-critical silent-failure path**: `apps/web/src/app/api/stripe/webhook/route.ts` — add a `captureException`/`captureMessage` call (provider-specific) alongside the existing `console.error` calls at lines 41, 49, 100, 133, so a webhook failure actually pages someone instead of waiting in logs.

Steps 1–4 are net-new files with no overlap with any other slice. Step 5 touches one existing file, isolated from every rate-limiting file above.

---

## 3. Content-Security-Policy (Report-Only readiness)

**Current state:** `apps/web/next.config.ts:6-25` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` — good baseline, but **no `Content-Security-Policy` header at all, Report-Only or enforced.** The `headers()` function applies to `source: "/:path*"`, i.e. every response including static files under `/public` — relevant below.

I walked every category the task called out. Findings, per category:

### 3.1 Inline script (the actual current blocker)
`apps/web/src/app/layout.tsx:84-90,103` — a static, unparameterized inline `<script>` (`themeScript`) sets the dark-mode class before paint. A **SHA-256 hash** (`'sha256-…'`) for this specific script is stable per deploy. However, a source-tree grep is not enough to conclude that it is the only inline script in the delivered document: Next.js also emits framework/hydration scripts at render time.

The bundled Next.js 16 CSP guide (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) documents the actual tradeoff: a nonce-based strict CSP forces dynamic rendering for every covered page, disabling the site's current static generation/ISR benefits; the static `apps/web/next.config.ts` approach uses `'unsafe-inline'`; and hash/SRI support for preserving static generation is still experimental. Therefore a theme-script hash alone is **not** a complete production policy. The Report-Only phase must inspect the production-rendered HTML and reports, and the owner must choose between (a) static generation with `'unsafe-inline'`, (b) dynamic nonce-based CSP, or (c) explicitly accepting experimental SRI after a separate test.

### 3.2 Playground (highest-complexity surface — three distinct mechanisms)
`modules/learning/src/ui/Playground.tsx` + `apps/web/public/py-worker.js`:

- **JS mode**: user code runs inside a `sandbox="allow-scripts"` `<iframe srcDoc=...>` (`Playground.tsx:394-401,460-467`) that calls `(0, eval)(e.data.code)` (line 47 of `RUNNER_SRCDOC`, embedded at line 30-52). No `allow-same-origin` in the sandbox token, so the iframe is an opaque, cookie-less origin — good defense-in-depth independent of CSP. **But**: per the CSP spec, a `srcdoc` document inherits the parent document's CSP. That means whatever `script-src` we ship must include `'unsafe-eval'` for the playground's eval-based execution model to keep working — and that `'unsafe-eval'` applies to the *whole page*, not just the sandboxed frame, which meaningfully narrows what CSP buys us elsewhere on pages that embed the playground. This is a genuine architectural tension, not a checklist item — flagging it as a decision point in §5, not silently designing around it.
- **HTML/CSS mode**: same `sandbox="allow-scripts"` `srcDoc` iframe (`Playground.tsx:389-401`), rendering arbitrary user HTML/CSS. No eval concern here, but same CSP-inheritance point applies to whatever inline `<style>`/`<script>` the user's HTML contains — already isolated by the sandbox token regardless of CSP.
- **Python mode**: `new Worker("/py-worker.js")` (line 142) — same-origin worker script, fine under `worker-src 'self'`. That worker then does `importScripts`/`fetch` against `PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"` (`apps/web/public/py-worker.js:19`) to load the WASM runtime. A worker's script-loading and fetches are governed by the CSP of the document that created it, so both `script-src` and `connect-src` need `https://cdn.jsdelivr.net` — matching what `architecture-review.md` §A3 already scoped.

Net effect for the playground: `script-src` needs `'unsafe-eval'` for JavaScript execution, and Python/WebAssembly may additionally report a need for `'wasm-unsafe-eval'`; `worker-src` needs `'self'`; and `script-src`/`connect-src` need `https://cdn.jsdelivr.net`. Confirm the exact Pyodide violations in Report-Only rather than assuming the JavaScript allowance also covers WebAssembly in every target browser.

### 3.3 OAuth
`packages/identity/src/auth.ts:22-23` — GitHub + Google providers via Auth.js, server-side redirect flow (no client-side SDK, no embedded iframe/widget). Avatars come back as `session.user.image` and are rendered as **plain `<img>`** tags (not `next/image`) in `modules/progress/src/ui/AccountIdentity.tsx:30` and `apps/web/src/shell/UserMenu.tsx:82,84`, with `referrerPolicy="no-referrer"` already set. Google/GitHub avatar hosts (`lh3.googleusercontent.com`, `avatars.githubusercontent.com`) need to be in `img-src` — or folded into the broader allowance below, since creator avatars already force `img-src` wide open.

### 3.4 Stripe
`modules/billing/src/ui/SubscribeButton.tsx:13-16` — `fetch("/api/checkout")` then a **full top-level `window.location.href` redirect** to Stripe's hosted Checkout page. No Stripe.js, no Elements, no iframe embed anywhere in the client bundle (confirmed by grepping for `/api/checkout` call sites — the only match is this one `fetch`). **Stripe requires zero CSP allowances** — a top-level navigation target isn't governed by `frame-src`/`connect-src` at all. This is worth stating plainly since it's the opposite of what's often assumed about Stripe + CSP.

### 3.5 Analytics
`apps/web/src/app/layout.tsx:11-13,144-146` — `@vercel/analytics`, `@vercel/speed-insights` (both self-hosted/proxied by Vercel, first-party), and `@next/third-parties`' `GoogleAnalytics`, gated behind `NEXT_PUBLIC_GA_ID` (dormant today — `flags.ts`-style pattern, line 19). Because `apps/web/next.config.ts` headers are static and apply regardless of runtime env, the CSP must be written to **already** tolerate GA turning on later: `script-src` needs `https://www.googletagmanager.com`, `connect-src` needs Google's analytics collection endpoints. The exact current endpoint set should be confirmed against the network tab once `NEXT_PUBLIC_GA_ID` is actually set in a test environment — don't hand-guess it into the policy; treat as a to-verify item during the Report-Only observation window (§5).

### 3.6 Workers
Covered in §3.2 — only one worker in the codebase (`apps/web/public/py-worker.js`), same-origin script, external CDN fetch for the WASM payload.

### 3.7 External assets
- Fonts: `next/font/google` (Cairo, JetBrains Mono — `layout.tsx:2,21-34`) are downloaded at **build time** and self-hosted; zero runtime font-host requests, so no `font-src` external allowance needed for them.
- `flag-icons` package: bundled via `@import "flag-icons/css/flag-icons.min.css"` in `apps/web/src/app/globals.css:2`, resolved by the build pipeline — same-origin static assets, not a CDN reference.
- **Creator/post images are the real `img-src` constraint**: `optionalSafeUrlSchema` (`packages/core/src/validation.ts:8-16`) restricts submitted avatar/image/link URLs to `http(s)://` but allows **any host**. `CreatorProfileCard.tsx:13-20` renders `creator.avatar` via `next/image` with the `unoptimized` prop — i.e. rendered as a plain external `<img>`, deliberately bypassing `next.config`'s (absent) `images.remotePatterns` allowlist. Same pattern applies to post `imageUrl`. This means `img-src` **cannot** be a tight allowlist without breaking a real product feature (creators embedding their own avatar/thumbnail from any host) — the realistic policy is `img-src 'self' data: blob: https:`, not a curated host list. Worth stating explicitly so nobody tries to "tighten" this later without knowing why it's wide.
- `@vercel/blob` is used only in `modules/academic/src/pipeline/collection/storage.ts` — an admin/content-pipeline path, not part of the public browser bundle. No public CSP impact.
- Server-side AI SDKs (`@anthropic-ai/sdk`, `@google/genai`, `@tavily/core`) are used exclusively under `modules/academic/src/pipeline/**` (content-generation scripts/admin pipeline) — never imported by client components. No `connect-src` relevance.

### 3.8 Proposed `Content-Security-Policy-Report-Only` (starting point, to refine during the observation window)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com;
worker-src 'self';
connect-src 'self' https://cdn.jsdelivr.net https://www.google-analytics.com https://analytics.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
report-uri /api/csp-report;
report-to csp-endpoint;
```

- This intentionally permissive **first observation policy** preserves the site's static generation while collecting external-source, worker, connection, framing, and object violations. It is not the final strict policy: `'unsafe-inline'`, `'unsafe-eval'`, and `'wasm-unsafe-eval'` must each be narrowed or explicitly accepted before enforcement. `frame-ancestors 'none'` preserves the existing `X-Frame-Options: DENY` posture rather than weakening it to same-origin framing.
- `style-src 'unsafe-inline'` matches `architecture-review.md` §A3's finding that Monaco injects inline styles — unverified line-level citation wasn't available (Monaco's runtime, not this repo's source) but the constraint is real and worth carrying forward; revisit once actual Report-Only violation reports come in (Monaco's CSS injection approach may allow tightening this later — treat as unconfirmed, not settled).
- No report collection endpoint exists today. To get real Report-Only telemetry (not just manual DevTools console-watching), add **one new route**, e.g. `apps/web/src/app/api/csp-report/route.ts`, accepting CSP POST payloads and forwarding sanitized summaries to the chosen monitoring provider. Configure both `Reporting-Endpoints: csp-endpoint="/api/csp-report"` and the CSP's legacy `report-uri` during rollout for browser coverage. The route itself is an unauthenticated ingestion surface, so it needs a small body limit, strict content-type handling, rate limiting, no payload echo, and removal/redaction of query strings before logging. Without a collector, Report-Only mode still does not block, but it produces no durable evidence beyond DevTools.

---

## 4. Implementation slices (non-overlapping file ownership)

| Slice | Owns (files) | Depends on | Effort | Risk |
|---|---|---|---|---|
| **A — Rate limit: creators domain** | `modules/creators/src/actions/register.ts`, `apps/web/src/app/api/creators/route.ts`, `modules/creators/src/actions/submit.ts`, `modules/creators/src/actions/submissions.ts`, `modules/creators/src/actions/edit-post.ts`, `modules/creators/src/actions/edit-profile.ts` | `packages/core/src/rate-limit.ts` (read-only import, no edit needed) | ~half day | trivial — additive guard clauses, same pattern already proven in 7 other files |
| **B — Rate limit: progress + notifications** | `modules/progress/src/actions/progress.ts`, `apps/web/src/app/api/notifications/read/route.ts` | `packages/core/src/rate-limit.ts` | ~1 hr | trivial |
| **C — Error monitoring & boundaries** | new: `apps/web/src/instrumentation.ts`, `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx`, `apps/web/src/app/admin/error.tsx`; edit: `apps/web/src/app/api/stripe/webhook/route.ts` (add capture calls alongside existing `console.error`, lines 41/49/100/133 only) | Vendor choice (§5) | ~1 day + vendor setup | low (additive; webhook edit is a 4-line addition next to existing logging, not a behavior change) |
| **D — CSP Report-Only** | edit: `apps/web/next.config.ts` (add `Content-Security-Policy-Report-Only` + `Reporting-Endpoints` headers); new: `apps/web/src/app/api/csp-report/route.ts` | Monitoring destination; explicit static-vs-nonce-vs-SRI decision only before enforcement | ~1 day + 1–2 week observation window | medium — non-blocking in Report-Only, but the ingestion endpoint must be abuse-safe and someone must review the reports before enforcement |

No two slices touch the same file. A and B can run fully in parallel; C and D are independent of A/B and of each other, and can also run in parallel. C should land before D's *enforce* step (not before Report-Only) so CSP violations discovered during the observation window are visible in the same monitoring pipeline rather than only in browser DevTools.

---

## 5. Tests / acceptance criteria

Repo convention is Node's built-in test runner with mocked `db`/`auth` (see `tests/quiz-exam-certificate-security.test.mjs` for the established style: fake modules, no real DB/network I/O) — no `vitest`/`jest` config exists, so follow that pattern rather than introducing a new one.

- **Slice A/B**: for each endpoint, one test asserting the Nth+1 call within the window is rejected with the same generic failure shape the endpoint already uses on other validation failures (no new error "oracle" — mirrors `submitSuggestion`'s existing behavior of returning `{ok: false}` uniformly). Manual QA: exercise each creator flow (register, submit, edit, delete, profile edit) once normally end-to-end to confirm the *first* call still succeeds (regression check — a rate limit keyed or windowed wrong could lock out legitimate single use).
- **Slice C**: (a) a component test/manual check that `error.tsx` renders on a thrown error in a page and `reset()` recovers; (b) manual check that `admin/error.tsx` surfaces a thrown `"Forbidden"` string; (c) trigger a deliberate throw in a local dev request and confirm it reaches the chosen provider's dashboard (or local capture stub) via `onRequestError`; (d) temporarily break the Stripe webhook path in a **test-mode-only** local run (bad signature) and confirm the capture call fires alongside `console.error`.
- **Slice D (Report-Only phase)**: manual, cross-page — load `/`, `/playground` (all three modes: run JS, run Python, edit HTML/CSS), `/pricing` → click subscribe (Stripe test mode) through to redirect, `/login` (OAuth avatar render post-login), a lesson page with an embedded playground, and the admin login for each role. Confirm zero *unexpected* violation reports (the theme script hash, Monaco/jsdelivr, and Pyodide/jsdelivr entries are expected to report clean; anything else appearing is new information, not a known-good). `npm run build` must still keep all lesson/track/quiz pages static (per `architecture-review.md`'s existing verification note) — CSP work must not be the thing that flips a page to dynamic rendering.

## 6. Rollout / rollback

- **A/B**: standard deploy. Rollback = revert the commit; no data migration, no schema change, no user-visible behavior change on the success path.
- **C**: land the boundaries + `instrumentation.ts` first (pure addition, safe even with no provider configured — `onRequestError` and `error.tsx` degrade to "no-op capture" if a provider isn't wired yet). Wiring an actual vendor SDK is a separate, owner-approved step (see §7 — out of scope for this audit to choose or install). Rollback = remove the files; nothing else depends on them.
- **D**: `Content-Security-Policy-Report-Only` is non-blocking for resource loading, so policy mistakes do not break pages; the new collector still needs the abuse controls listed in §3.8. Do **not** flip to enforcing `Content-Security-Policy` until: (1) the observation window (1–2 weeks minimum, matching `architecture-review.md`'s estimate) shows no unexplained violations across the pages listed in §5, (2) the `'unsafe-eval'`/`'wasm-unsafe-eval'` playground tradeoff has been explicitly signed off or isolated, and (3) the owner has selected the static `'unsafe-inline'`, dynamic nonce, or experimental SRI strategy documented by Next.js 16. Rollback = remove the headers and collector route; Report-Only never blocked page resources.

## 7. Unknown / owner-input-required decisions

These cannot be resolved by reading the code and need an explicit call from the project owner before or during implementation:

1. **Error-monitoring vendor.** `ROADMAP.md` names "Sentry (أو Vercel Agent)" as options but doesn't commit. This determines what `apps/web/src/instrumentation.ts` actually calls, and requires installing a new package + provisioning a DSN/API key — both outside this audit's read-only, no-install mandate.
2. **Alert destination/on-call.** Once errors are captured, who gets paged and how (email, Slack, PagerDuty) — not decidable from the repo.
3. **Duplicate creator-registration endpoint.** `apps/web/src/app/api/creators/route.ts` and `modules/creators/src/actions/register.ts` do the identical write. Phase 0 fixes both in place (§4, Slice A), but whether one of the two should eventually be deprecated (and which consumer uses the API route vs. the server action) is a product decision, not inferable from the code alone.
4. **Vercel WAF / Firewall rate-limit rules.** `architecture-review.md` §A2 recommended a durable IP-based layer at the Vercel dashboard level (outside the repo, so it cannot be verified by a code audit). Please confirm whether this was ever configured — if not, the in-code limiter in §1 is the *only* layer, which raises the priority of closing the §1.2 gaps.
5. **`'unsafe-eval'` tradeoff sign-off (§3.2).** The playground's JS-run feature architecturally requires it in `script-src` for as long as the sandboxed iframe inherits the parent's CSP; there's no code change available within this phase's scope that removes the need. Confirm this is an accepted, understood tradeoff before enforcing (Report-Only is unaffected either way).
6. **CSP enforce timeline.** How long to stay in Report-Only, and who signs off on flipping to enforced — a process decision, not a technical one.
7. **`NEXT_PUBLIC_GA_ID` activation plans.** If/when GA is actually turned on, the exact `connect-src`/`script-src` entries in §3.8 should be re-verified against real network traffic rather than trusted as final from this audit.
8. **Static generation vs strict script CSP.** Next.js 16 requires dynamic rendering for request nonces, while the documented static-header approach retains `'unsafe-inline'` and experimental SRI is not yet a stable default. Choose the acceptable security/performance tradeoff before enforcement; Report-Only can start with the permissive observation policy above without making that decision prematurely.

---

## Appendix: files read for this audit

`package.json`, `apps/web/next.config.ts`, `packages/identity/src/auth.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/playground/page.tsx`, `modules/learning/src/ui/Playground.tsx`, `apps/web/public/py-worker.js`, `packages/core/src/rate-limit.ts`, `packages/core/src/validation.ts`, `modules/creators/src/creators.ts`, `packages/db/src/schema.ts` (creators table), `modules/billing/src/ui/SubscribeButton.tsx`, `src/components/CreatorProfileCard.tsx` (`modules/creators/src/ui/CreatorProfileCard.tsx`), `modules/progress/src/ui/AccountIdentity.tsx`, `apps/web/src/shell/UserMenu.tsx`, `apps/web/src/app/api/checkout/route.ts`, `apps/web/src/app/api/stripe/webhook/route.ts`, `apps/web/src/app/api/creators/route.ts`, `apps/web/src/app/api/notifications/read/route.ts`, `modules/feedback/src/actions/suggest.ts`, `modules/progress/src/actions/progress.ts`, `modules/jobs/src/actions/alerts.ts`, `modules/assessment/src/actions/lesson-quiz.ts`, `modules/assessment/src/actions/exam.ts`, `modules/certificates/src/actions/certificate.ts`, `modules/creators/src/actions/register.ts`, `modules/creators/src/actions/submit.ts`, `modules/creators/src/actions/submissions.ts`, `modules/creators/src/actions/edit-post.ts`, `modules/creators/src/actions/edit-profile.ts`, `apps/web/src/app/globals.css`, `docs/architecture-review.md`, `docs/ROADMAP.md`, `tests/quiz-exam-certificate-security.test.mjs`, plus directory-wide greps for `rateLimit(`, `console.error`, `instrumentation*.ts`, `onRequestError`, `next/image`, `@vercel/blob`, and the AI SDK imports to confirm they're server-only.
