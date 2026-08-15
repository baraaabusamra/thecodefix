# Final Pre-Production Watch-List Audit

**Scope:** narrow. Only the three watch-list clusters flagged in
[`docs/pre-production-audit.md`](pre-production-audit.md) §6 — the "security best-practices" family,
the SSR/CSR/perf trio, and the Dart↔Flutter separation. **Not** a re-audit of all 491 CREATE
records.

**Constraints honored:** no article bodies written; `batch-001.json`,
`content/data/content-backlog.json`, and `docs/content-roadmap.md` were **not modified**. All
recommendations await explicit human approval.

**Difference from the prior audit:** this pass reads the **actual content** of the existing live
lessons (word counts + section outlines from `src/content/tracks/**`), not just their slug names.
That grounding **revised one earlier call** (see 437) and firmed up several others.

**Posture:** adversarial — the goal was to find remaining false `CREATE`s, not defend the roadmap.

---

## Evidence base — what the live pages actually contain

Measured directly from the MDX files (Arabic lessons; titles translated):

| Live page | Words | Sections it actually covers |
|---|--:|---|
| `nextjs/22-rendering-strategies` | 169 | Next's **four modes**: static/SSG (default), ISR, dynamic/SSR, streaming — **assumes** the reader knows what SSR/CSR are |
| `nextjs/02-server-client` | 226 | React **Server vs Client Components**, `'use client'` — not general CSR/SSR |
| `nextjs/17-images-fonts` | 130 | `next/image`, external images, `next/font` — **Next components only** |
| `react/15-performance` | 366 | `React.memo`, `useMemo`, `useCallback` — re-render avoidance |
| `react/27-performance-optimization` | 227 | memo/useMemo, **code-splitting via lazy/Suspense**, react-window, DevTools profiling |
| `flutter/01-dart` | 182 | Dart primer for Flutter: variables, functions, lists, classes |
| `flutter/06-dart-deep` | 187 | "Dart deep": variables, functions, classes, collections, **one `## async` section** |
| `flutter/18-async-future` | 145 | `Future`/async-await, **`FutureBuilder`/`StreamBuilder`** (Flutter widgets) |

These are concise, framework-specific lessons — not deep, framework-agnostic pillar pages. That
distinction drives the verdicts below.

---

## Cluster A — "Security Best-Practices" family

Audited: **035, 068, 177, 201**. Discovered related existing pages: there is **no AWS track**, so
no existing AWS best-practices page exists to collide with. Adjacent existing best-practices
lessons (`devops/23`, `docker/23`, `sql/23`, `cybersecurity/23`, `api-security/10-database-security`,
`api-security/27`) are per-existing-track and in **different domains** — cross-link targets, not
cannibalization.

**Core question:** is each an aggregation of narrower pages that shouldn't be separate URLs?

| Item | Current | Recommended | Reason | Canonical/parent | Risk | Conf |
|---|---|---|---|---|---|--:|
| **035** AWS Security Best Practices for Beginners | CREATE | **MERGE** | The one true aggregation. Beginner/P3 roundup whose substance is already promised by dedicated AWS-cluster security pages (`010` Shared Responsibility, `018` IAM least-privilege, `034` secure-S3, `005` IAM). Little standalone value a beginner can't get from those. | Fold into **010 + 018 + 034** (orient on 010) | **MEDIUM** | 62 |
| **068** Kubernetes Security Best Practices | CREATE | **CREATE** (guardrail) | K8s security is a *discipline* (pod security standards, network policies, RBAC, secrets, image scanning, admission control) that goes well beyond the cluster's `057` secrets + `069` RBAC — it introduces net-new hardening concepts. Intermediate/P1, not a 101 roundup. **Guardrail:** must synthesize a hardening guide, not link-list; if it ends up merely restating 057+069, demote to MERGE. | cross-link 057, 069; devops/23 | **MEDIUM** | 66 |
| **177** Redis Security Best Practices | CREATE | **CREATE** | Strongest of the four. The **only** Redis security page; net-new domain. Covers concrete Redis-specific hardening (protected mode, `bind`, `requirepass`/ACLs, `rename-command`, TLS, exposure risk) — Redis is famously exploited when left open. Aggregates nothing (other Redis pages are caching/data-types/pub-sub). | — (net-new) | **LOW** | 82 |
| **201** Secure a PostgreSQL Database in Production | CREATE | **CREATE** | PG-specific production hardening (`pg_hba.conf`, SSL/TLS, SCRAM, row-level security, roles, extension risk) not covered by generic `api-security/10-database-security` or `cybersecurity/23`. Practical-guide framing, more actionable than a "best practices" roundup; distinct from `200` (RBAC concept). | cross-link 200, api-security/10-database-security | **LOW-MED** | 76 |

**Verdict:** the "best practices" pattern is **not systemically thin**. Only **035** is a genuine
aggregation (Beginner-101, in a cluster that already has dedicated security pages). **177/201** are
domain-specific hardening pages in net-new domains; **068** stands *if* it synthesizes. → **1 MERGE
(035), 3 CREATE**.

---

## Cluster B — SSR / CSR / Web-Perf trio

Audited: **437, 432, 438** vs live `nextjs/22-rendering-strategies` (+ `nextjs/02-server-client`,
`nextjs/17-images-fonts`, `react/27-performance-optimization`).

| Item | Current | Recommended | Reason | Canonical/parent | Risk | Conf |
|---|---|---|---|---|---|--:|
| **437** SSR vs CSR: Performance Tradeoffs | CREATE | **CREATE** (scoped) — *revises the prior audit's tentative MERGE* | Reading the live page changed the call: `nextjs/22` (169 w) teaches Next's **four modes and assumes SSR/CSR is already understood**; `nextjs/02` is Server/Client **Components**; the React track covers memo/lazy, not rendering *location*. So the **framework-agnostic fundamentals** (where rendering happens, hydration, SEO, TTFB/TTI/FCP tradeoffs, when to choose each) are a genuine **gap**, not a duplicate. **Guardrail:** scope strictly to fundamentals, **re-home** out of "Web Performance" into a rendering/fundamentals grouping, and cross-link `nextjs/02` + `nextjs/22` as the applied follow-ups. **Most-contestable item in this audit** — a maintainer could reasonably still choose MERGE if the site prefers to teach rendering only in the Next context. | concept → `nextjs/02` + `nextjs/22` (applied) | **MEDIUM** | 58 |
| **432** Optimize Images for the Web | CREATE | **CREATE** | `nextjs/17-images-fonts` (130 w) is **`next/image`/`next/font` only**. General image optimization (formats WebP/AVIF, responsive `srcset`, compression, dimensions) is not covered and applies to plain HTML/CSS learners too. Distinct intent. Cross-link `nextjs/17`. | cross-link nextjs/17; relates 425/433 | **LOW-MED** | 78 |
| **438** Reduce JavaScript Bundle Size | CREATE | **CREATE** (guardrail) | `react/27` covers **code-splitting via lazy/Suspense** — a React slice. General bundle reduction (tree-shaking, dynamic import, bundle analysis, dependency diet, tooling-agnostic) is broader. **Guardrail:** keep tooling-agnostic; cross-link `react/27`; verify at drafting it doesn't duplicate `nextjs/23-deployment-optimization`. | cross-link react/27 | **MEDIUM** | 68 |
| `nextjs/22-rendering-strategies` (existing) | live | **KEEP** + add cross-link from 437 | Correct home for Next-specific rendering modes; not superseded. | — | — | — |

**Verdict:** all three candidates hold up once grounded in the actual (short, framework-specific)
live content. **437 is corrected from MERGE → CREATE-scoped** and remains the single most-contestable
page. → **3 CREATE (with guardrails), 0 MERGE**.

---

## Cluster C — Dart ↔ Flutter separation

Audited: the **standalone Dart track** (candidates 361–375, sampled proxy **362 Dart Null Safety**)
vs live `flutter/01-dart`, `flutter/06-dart-deep`, `flutter/18-async-future`.

**Decisive precedent (from the live inventory):** every other language that backs a framework on
this site has its **own standalone track** beside the framework — `javascript` (beside
react/nextjs/nodejs), `typescript` (beside react/nextjs), `python` (beside django), `php` (beside
laravel). **Dart is the only exception** — it currently exists *only* inside Flutter. A standalone
Dart track **follows the established site pattern**, it doesn't break it.

**Content grounding:** the three Flutter Dart lessons total **~514 words** of Flutter-context primer
(variables/functions/classes, one `async` section, `FutureBuilder`/`StreamBuilder`). They teach
"just enough Dart to use Flutter." The Dart track teaches the **language**: standalone install
(`366`), CLI apps (`374`), deep null safety (`362`), Streams (`364`), error handling (`370`),
Dart-vs-JS (`372`) — content **absent** from Flutter.

| Item | Current | Recommended | Reason | Canonical/parent | Risk | Conf |
|---|---|---|---|---|---|--:|
| **Standalone Dart track (361–375)** | CREATE (15) | **CREATE** (confirmed) | Justified by direct site precedent (JS/TS/Python/PHP all have standalone tracks beside frameworks). Distinct audience: Dart-the-language / CLI, not Flutter UI. | language track; cross-link Flutter | **MEDIUM** (fundamentals overlap, same as JS↔React) | 80 |
| **362** Dart Null Safety (Wave-1 pillar) | CREATE | **CREATE** | Prior audit flagged at 0.55 fearing `flutter/06-dart-deep` covered it. Grounding shows 06-dart-deep is a **187-word** overview that merely *mentions* null safety. A dedicated page (sound null safety, `?`/`!`/`late`/`required`, migration) is genuinely deeper — parallel to how the `typescript` track goes beyond `react/05-typescript-react`. | 361 (What Is Dart) → 362 | **MEDIUM** | 72 |
| `flutter/01-dart`, `06-dart-deep`, `18-async-future` (existing) | live | **KEEP** + cross-link Dart track | They serve Flutter learners who don't want the full language track (same as `react` keeping its own JS-in-context lessons). | — | — | — |

**Verdict:** the Dart↔Flutter separation is **justified and non-cannibalizing** under the site's own
precedent; overlap on fundamentals is the same acceptable overlap already tolerated for JS↔React and
Python↔Django, managed by bidirectional cross-links. → **CREATE confirmed, 0 MERGE**.

---

## New watch-list items (report-only; scope NOT expanded)

Discovered during the check; **not** audited to a decision here — logged for the drafting stage:

1. **"Common X Mistakes" family** (13 pages: `071, 091, 116, 135, 161, 236, 309, 340, 396, 422,
   442, 495`, plus already-MERGE `462`). Each is per-domain and likely distinct, but every one must
   **synthesize** at drafting, not restate its cluster's troubleshooting pages. Non-blocking; apply
   the same "synthesize-or-merge" gate used on 035.
2. **`155` PowerShell Security Best Practices *and* Common Attack Techniques** — title bundles **two**
   topics (defensive hardening + offensive techniques). Consider splitting or tightly scoping.
   Non-blocking.
3. **Flutter Dart lessons maintenance** — once the Dart track ships, consider slimming
   `flutter/06-dart-deep` to a pointer + cross-link (Flutter-track housekeeping, *not* a backlog
   candidate).
4. **`438` vs `nextjs/23-deployment-optimization`** — that Next lesson wasn't opened here; verify no
   bundle-optimization duplication at drafting.

---

## Summary

| | |
|---|--:|
| **Backlog candidates audited** (to a decision) | **8** — 035, 068, 177, 201, 437, 432, 438, 362 (Dart-track proxy) |
| Existing live pages examined for grounding | 8 (nextjs ×3, react ×2, flutter ×3) — all **kept**, cross-links recommended |
| **CREATE confirmed** | **7** (068, 177, 201, 437-scoped, 432, 438, 362) + full Dart track |
| **MERGE recommended** | **1** (035 → 010/018/034) |
| **UPDATE recommended** | **0** |
| **REJECT recommended** | **0** |
| New watch-list items | **4** (report-only) |

**Net change vs current roadmap state within this watch-list:** exactly **one** — `035` → MERGE.
The prior audit's tentative `437` → MERGE is **revised back to CREATE (scoped)** after reading the
actual 169-word Next-specific lesson. The Dart separation and 068/177/201 are all **confirmed
CREATE**.

**Blocking issues:** none. 035 is not in Wave 1 (it's W3); the two Wave-1 Dart pillars (361, 362)
are **confirmed**; no Wave-1 page is affected.

**Wave 1 impact:** none negative. 362's confidence rose (55 → 72); the Dart-track rationale is now
firmly evidenced.

---

## ✅ WAVE 1 READY FOR PRODUCTION

Proceed to Wave 1, applying two housekeeping actions that do **not** block the start:

1. On human approval, mark **035 → MERGE** (fold into 010/018/034) in the dataset.
2. Attach the **scope guardrails** above to 068, 437, 438 (and the cross-links for 432, 201, the
   Dart track) so they're enforced when those pages are drafted — none are in Wave 1.

And keep the standing gates from the prior audit: security review for the SOC / Pentest / Auth
clusters, and human sign-off on the 6 pre-identified MERGE/UPDATE decisions plus the new 035.

*Final pre-production audit only — no article bodies written; no candidate files modified.*
