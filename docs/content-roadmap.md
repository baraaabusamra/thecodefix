# Content Roadmap — Batch 001 (497 Candidates)

**Pipeline:** Content Governance System §27 (bulk generation phases 1–5, 9) + §28 (priority
scoring), run against the entire 497-topic candidate backlog in
[`docs/content-backlog/batch-001.json`](content-backlog/batch-001.json).
**Generated:** 2026-08-13 · **Governing source of truth:** [`docs/content-guidelines.md`](content-guidelines.md), [`AGENTS.md`](../AGENTS.md).

> **This is the intelligence layer, not production.** No article bodies were written.
> `STATUS: CREATE` means a candidate passed the §7 page-existence test, is de-duplicated
> against the other 496 candidates and the live site, has a place in the knowledge
> architecture, and is scored/sequenced — **not** that it is drafted, verified, or
> publish-ready. Writing each page (research → verification → code validation → Arabic
> prose → internal linking) still happens per the §11–§14/§21 quality bar.
>
> Machine-readable output: [`content/data/content-backlog.json`](../content/data/content-backlog.json)
> (497 traceable records; every source `TCF-` id is preserved).

---

## 1. Executive summary

| | |
|---|---|
| **Candidates processed** | **497** |
| **CREATE** | **490** |
| **MERGE** | **6** (5 internal intent-duplicates + 1 thin aggregation — `035`, folded into canonical pages) |
| **UPDATE** | **1** (candidate better served by enriching an existing live page) |
| **REJECT** | **0** (see §4 for why this is honest, not a rubber-stamp) |
| **Clusters** | **21** (each an already-missing domain track; the backlog is ~96% net-new terrain) |
| **Managed cannibalization guardrails** | **47** CREATE pages carry an explicit scope rule to avoid competing with a sibling candidate or an existing track |
| **Score range** | 55–89 / 100 (transparent 10-factor model, §5) |
| **Publishing waves** | 7 (30 / 133 / 113 / 73 / 16 / 85 / 40) |

> **Post-audit change (applied):** `035 AWS Security Best Practices` was moved **CREATE → MERGE**
> (→ `010`/`018`/`034`) following [`docs/final-watchlist-audit.md`](final-watchlist-audit.md). That
> audit also confirmed `068`/`177`/`201` as CREATE and revised `437` back to CREATE (scoped). See
> the pre-production audits: [`docs/pre-production-audit.md`](pre-production-audit.md) ·
> [`docs/final-watchlist-audit.md`](final-watchlist-audit.md).

**Headline finding.** This is a *clean, well-constructed* backlog — it was generated with the
page-existence test already in mind and deliberately targets **21 domains the site does not yet
cover at all**. So the residual work of this phase was **not** mass rejection; it was (a)
catching the handful of genuine duplicate *intents*, (b) resolving overlap with the 34 existing
tracks by **scope discipline + cross-linking** rather than deletion, and (c) turning a flat list
into a dependency-aware, wave-sequenced production plan.

**Top 3 prerequisite hubs** (drive everything downstream — build first):
`TCF-000097 What Is Machine Learning?` (39 dependents), `TCF-000398 What Is Unit Testing?` (24),
`TCF-000072 What Is Infrastructure as Code?` (24).

**Recommended first wave to produce:** the **30 foundation pillars** in §10, Wave 1 — one or two
anchor "what is X" stones for each of the 21 new clusters. Everything else assumes these exist.

---

## 2. Pipeline outcome (steps 1–12)

| Step | What ran | Result |
|---|---|---|
| 1. Load | All 497 candidates loaded from `batch-001.json` | 497 |
| 2. Normalize | Title/terminology normalization + alias folding (k8s→kubernetes, postgres→postgresql, IaC→infrastructure as code, ML/LLM, CI/CD). Original title preserved as `original_title`. | 497 normalized, 0 lost |
| 3. Intent | Validated the candidate's `search_intent` against title pattern (what-is→Educational, vs→Comparison, how-to-fix→Troubleshooting, how-to→Tutorial/Practical) | see §7 |
| 4. Content type | Validated `content_type` against title/format | see §7 |
| 5. Page-existence test (§7) | Six sub-tests per candidate | 490 pass → CREATE; 7 fail a sub-test → MERGE/UPDATE |
| 6. Semantic dedup | Jaccard token-similarity across **all 497** + manual review of every high-overlap pair | 5 intent-duplicates found (a 6th merge, `035`, added later by the pre-production audit) |
| 7. Cannibalization | Each candidate checked against the 34 live tracks (slug-level) | 5 MERGE, 1 UPDATE, 48 managed guardrails |
| 8. Knowledge architecture | domain → category → cluster → parent → children → prereqs → related → next-step | §3 |
| 9. Difficulty | Beginner / Intermediate / Advanced | §7 |
| 10. Priority score | Transparent 10-factor /100 (§5) | range 55–89 |
| 11. Final status | CREATE / MERGE / UPDATE / REJECT with reason | §1 counts |
| 12. Rank | CREATE sorted by score | §6 |

---

## 3. Knowledge architecture — 21 clusters

The batch resolves into **21 domain clusters**, each mapping to a *track the site does not have
yet*. Each cluster has an **anchor pillar** (the foundational "what is X" page every other page in
the cluster depends on). Per §29 each mature cluster should end up with pillar + supporting +
practical + assessment + project + reference — this batch seeds all six layers for most clusters.

| Cluster | Candidates (CREATE) | Anchor pillar | Existing-track adjacency |
|---|---|---|---|
| AI, ML & LLMs | 40 | `TCF-000097` What Is Machine Learning? | none — net-new |
| AWS Cloud Foundations | 36 | `TCF-000001` What Is Cloud Computing…? | none — net-new |
| SOC & Blue Team | 35 | `TCF-000276` What Is a SOC? | cybersecurity (defensive) — different intent |
| Kubernetes & Orchestration | 34 | `TCF-000037` What Is Kubernetes? | devops/22 (intro only), docker/26 |
| System Design | 30 | `TCF-000207` What Is System Design? | microservices (deep) — cross-link |
| Offensive Security / Pentest | 30 | `TCF-000312` Phases of a Pen Test | api-security/16 (defensive) — different intent |
| Terraform / IaC | 25 | `TCF-000072` What Is IaC? | devops/12-iac (one lesson) |
| PowerShell Scripting | 25 | `TCF-000138` PowerShell Cmdlets | none — net-new |
| PostgreSQL Administration | 25 | `TCF-000182` PostgreSQL MVCC | sql (generic SQL) — PG-specific depth |
| Testing & Eng Practice | 25 | `TCF-000398` What Is Unit Testing? | react/23-testing (React-only) |
| OS & Computer Architecture | 24 | `TCF-000238` CPU Scheduling | linux (practical) — theory is net-new |
| Interview & Career | 22 | `TCF-000376` How Tech Interviews Work | dsa/23-interview-tips — different framing |
| Redis & Caching | 20 | `TCF-000162` What Is Redis? | none — net-new |
| Ruby | 20 | `TCF-000341` What Is Ruby? | none — net-new |
| Web Performance & a11y | 20 | `TCF-000423` What Is Web Performance? | css/html/nextjs (partial) |
| Auth & Identity | 17 | `TCF-000443` What Is OAuth 2.0? | cybersecurity/api-security (partial) |
| Dart | 15 | `TCF-000361` What Is Dart? | flutter/01-dart (in-context) |
| Mobile Platforms | 15 | `TCF-000464` Mobile App Lifecycle | flutter/kotlin/swift (partial) |
| Compilers & Language Theory | 14 | `TCF-000261` What Is a Compiler? | none — net-new |
| Data Modeling & DB Design | 10 | `TCF-000488` ER Modeling | sql/20-normalization (partial) |
| Open Source & Collaboration | 9 | `TCF-000478` First OSS Contribution | git (partial) |

**Cross-cutting mini-clusters** worth linking as learning sub-graphs (they span domains):
*Concurrency* (OS 247/248/252/255/260 + PG deadlocks 197), *Injection attacks* (Pentest offense
329/323 ↔ cybersecurity/api-security/sql defense), *Caching* (Redis ↔ System Design 213/219 ↔ AWS
CloudFront 012), *Rate limiting* (System Design 218/226 ↔ Redis 171 ↔ api-security/06),
*Multi-tenancy* (PG 204 ↔ Data Modeling 493).

---

## 4. Why REJECT = 0 (and it is not a rubber-stamp)

Every candidate cleared the §7 "educational value" and "content depth" bars, and each has a home
in the architecture above. A REJECT would require a candidate with **no unique value and no merge
destination** — none exists here, because the batch was authored against the guidelines. Where a
candidate *did* fail a sub-test, the correct action per §35 was **MERGE** (fold into a canonical
page) or **UPDATE** (enrich an existing page), not discard. Per §18 quality gate: **no topic was
rejected for low search volume, and no topic was approved merely because a keyword exists** —
approvals rest on educational purpose + architectural fit, and the three top-ranked pages are
*prerequisite hubs*, not high-volume vanity terms.

---

## 5. Priority scoring model (§28)

Every candidate gets a transparent **0–100** score from ten weighted factors. Search volume is
**not** an input — a low-demand prerequisite outranks a high-demand leaf. The full per-factor
breakdown is stored on every record (`score_breakdown`) and sums exactly to `priority_score`.

| Factor | Max | Driven by |
|---|---:|---|
| Educational importance | 15 | content type + how foundational (beginner concept scores highest) |
| Dependency importance | 15 | **in-degree**: how many other candidates list this as a prereq/parent (+P0 bonus) |
| Search/intent value | 12 | intent (Troubleshooting & Comparison rank high — matches the site's error-cluster SEO bet) |
| Content gap | 12 | new-domain (high) vs partial-overlap (med) − cannibalization penalty |
| Topical authority | 10 | ability to anchor a brand-new domain |
| User usefulness | 10 | how directly it solves a real task |
| Practical value | 8 | tutorial/project/exercise weighting |
| Business/career value | 8 | market demand of the domain (cloud/k8s/AI/system-design/auth = high) |
| Difficulty accessibility | 5 | beginner-reachable content scores slightly higher |
| Existing-coverage clarity | 5 | full if novel; reduced if a guardrail is needed |

**Dependency is the heavy lever, exactly as §28 requires.** It is what lifts
`What Is Machine Learning?` (in-degree 39) and `What Is Unit Testing?` (24) to the top of the
list despite being simple beginner concepts — 39 and 24 other candidates cannot be taught until
those exist.

---

## 6. Priority rankings

### Top 20 highest-priority CREATE topics

| # | Score | ID | Title | Cluster | In-deg |
|---:|---:|---|---|---|---:|
| 1 | 89 | TCF-000097 | What Is Machine Learning? | AI, ML & LLMs | 39 |
| 2 | 89 | TCF-000398 | What Is Unit Testing and Why Does It Matter? | Testing & Eng Practice | 24 |
| 3 | 84 | TCF-000072 | What Is Infrastructure as Code and Why Does It Matter? | Terraform / IaC | 24 |
| 4 | 82 | TCF-000029 | How to Debug S3 Bucket Permission Errors ("Access Denied") | AWS Cloud Foundations | 0 |
| 5 | 82 | TCF-000030 | How to Fix "InvalidClientTokenId" AWS CLI Errors | AWS Cloud Foundations | 0 |
| 6 | 82 | TCF-000064 | How to Fix "ImagePullBackOff" Errors in Kubernetes | Kubernetes & Orchestration | 0 |
| 7 | 82 | TCF-000086 | How to Resolve "Resource Already Exists" Errors in Terraform | Terraform / IaC | 0 |
| 8 | 81 | TCF-000001 | What Is Cloud Computing…? | AWS Cloud Foundations | 0 |
| 9 | 81 | TCF-000038 | Understanding Kubernetes Architecture | Kubernetes & Orchestration | 0 |
| 10 | 81 | TCF-000073 | What Is Terraform and How Does It Work? | Terraform / IaC | 0 |
| 11 | 81 | TCF-000207 | What Is System Design…? | System Design | 0 |
| 12 | 81 | TCF-000276 | What Is a Security Operations Center (SOC)? | SOC & Blue Team | 0 |
| 13 | 81 | TCF-000312 | Understanding the Phases of a Penetration Test | Offensive Security / Pentest | 0 |
| 14 | 81 | TCF-000376 | How Do Technical Interviews Actually Work? | Interview & Career | 0 |
| 15 | 81 | TCF-000399 | Understanding the Testing Pyramid | Testing & Eng Practice | 0 |
| 16 | 80 | TCF-000016 | How to Launch and Connect to Your First EC2 Instance | AWS Cloud Foundations | 0 |
| 17 | 80 | TCF-000017 | How to Host a Static Website on Amazon S3 | AWS Cloud Foundations | 0 |
| 18 | 80 | TCF-000018 | How to Create an IAM User with Least-Privilege Access | AWS Cloud Foundations | 0 |
| 19 | 80 | TCF-000023 | How to Set Up a MySQL Database on Amazon RDS | AWS Cloud Foundations | 0 |
| 20 | 80 | TCF-000025 | How to Set Up a Custom Domain with Route 53 | AWS Cloud Foundations | 0 |

> Ranks 4–7 are **error/troubleshooting pages** rising on search-intent value — this is
> **intentional and strategy-aligned** (the site's SEO direction names the error cluster as its
> best traffic bet). Note the *ranking* rewards them, but the *production waves* (§10) place them
> in Wave 3, because a troubleshooting page should be written after its concept exists.

### Prerequisite hubs (build-order backbone)

Only three candidates have meaningful in-degree; they are the spine of the whole backlog:

| In-deg | Score | ID | Title |
|---:|---:|---|---|
| 39 | 89 | TCF-000097 | What Is Machine Learning? |
| 24 | 89 | TCF-000398 | What Is Unit Testing and Why Does It Matter? |
| 24 | 84 | TCF-000072 | What Is Infrastructure as Code and Why Does It Matter? |

(All other candidates have in-degree 0–1: the backlog is broad-and-shallow across 21 domains
rather than deep within one, so dependency concentrates at each cluster's single anchor pillar.)

---

## 7. Distributions

**Content type** (497): Concept 172 · Tutorial 90 · Comparison 61 · Practical Guide 43 ·
Technical Article 29 · Exercise 21 · Troubleshooting 19 · Quiz 19 · Project 16 · Reference 15 ·
Cheat Sheet 12.

**Search intent** (497): Educational 220 · Tutorial 90 · Practical 80 · Comparison 61 ·
Reference 27 · Troubleshooting 19.

**Difficulty** (497): Beginner 217 · Intermediate 206 · Advanced 74.

> *Observation (feeds Batch 002 planning):* the mix is **concept-heavy** because 21 domains are
> being established from zero — the "what is X" layer legitimately comes first. As these clusters
> mature, later batches should shift toward Tutorial / Practical / Troubleshooting to fill each
> cluster's practice + assessment layers (§29).

---

## 8. Parent/child & the learning graph (§17–§18)

Every record carries `parent_topic`, `child_topics` (computed — candidates whose prereq/parent
resolves to this one), `prerequisites`, `related_topics`, and `next_learning_step`, so the backlog
is a **learning graph**, not a flat list. Each cluster forms a mini-path anchored on its pillar,
e.g.:

```
Terraform / IaC:
  TCF-000072 What Is IaC?  ─┬─ TCF-000073 What Is Terraform? ─┬─ 074 State ─ 076 Modules ─ 077 Plan/Apply
                           │                                 ├─ 078 First config ─ 079 EC2 ─ 080 Vars/Outputs
                           │                                 ├─ 085/086 Troubleshooting
                           │                                 └─ 094 Project: VPC + web server
                           └─ (24 dependents total)
```

At authoring time, each page must also link **outward** to the adjacent existing track named in
its `cannibalization_risk` field (e.g. a System-Design page → the `microservices` track).

---

## 9. Deduplication & cannibalization resolution

### 9a. MERGE (6) — duplicate/near-duplicate/thin intent folded into a canonical page

| Candidate | Folds into | Reason |
|---|---|---|
| `TCF-000035` AWS Security Best Practices for Beginners | **`010` + `018` + `034`** | *(post-audit)* Thin aggregation of dedicated AWS security pages (Shared Responsibility, IAM least-privilege, secure-S3); a beginner roundup doesn't justify its own URL. |
| `TCF-000066` Kubernetes vs Docker Swarm | **`docker/26-swarm-vs-k8s.mdx`** (existing) | The comparison already exists as a lesson — expand it, don't duplicate. |
| `TCF-000270` Compiled vs Interpreted Languages | `TCF-000265` Compiler vs Interpreter | Same comparison, reworded (intent duplication). |
| `TCF-000454` Session Cookies vs JWTs | `TCF-000446` Session- vs Token-Based Auth | Same comparison axis. |
| `TCF-000449` What Is a Passkey? | `TCF-000448` Passwordless Auth (Passkeys & WebAuthn) | Passkey is the concrete case of passwordless — one page. |
| `TCF-000462` Common Auth Mistakes → Breaches | `TCF-000457` Common Auth Vulnerabilities & Prevention | Auth "mistakes" == auth "vulnerabilities". |

### 9b. UPDATE (1) — existing page serves the intent better

| Candidate | Update target | Reason |
|---|---|---|
| `TCF-000481` Semantic Versioning for Libraries/APIs | **`devops/10-semantic-versioning.mdx`** | SemVer is already taught; extend with the library/public-API + breaking-change angle. |

### 9c. Managed cannibalization guardrails (47 CREATE pages kept, with a scope rule)

These are **not** duplicates — they are pages whose topic *touches* a sibling candidate or an
existing track, kept CREATE **because the intent differs**, each with an explicit guardrail in its
`cannibalization_risk` field. Grouped:

**Offense vs defense (intent-differentiated — keep both, cross-link):** Pentest SQLi-exploit
`329`, command-injection `323`, pentest pillar `311` ↔ the defensive `cybersecurity/*` &
`api-security/*` lessons. *Highest-value example of correct differentiation — do not merge.*

**New canonical concept vs shallow existing mention (keep new, cross-link + update the old):**
`037` K8s ↔ `devops/22-kubernetes-intro`; `072` IaC ↔ `devops/12-iac`; `013` AWS-CFN defers the
generic concept to `072`.

**AWS-service page vs general System-Design concept (concept is canonical):** `012` CloudFront →
`219` CDN; `015` SQS → `215` Message Queue; `021` ALB → `209` Load Balancing; `009` Auto-Scaling
↔ `208` Horizontal Scaling.

**Deep track exists — new page is the entry concept (cross-link the deep track):** System-Design
`216` monolith-vs-microservices, `223` circuit-breaker, `224` saga, `217` API-gateway ↔
`microservices` track.

**PostgreSQL-specific vs generic SQL (keep PG depth):** `196` EXPLAIN ANALYZE, `205` PG
optimization ↔ `sql/27-28`; `491` denormalization ↔ `sql/20-normalization`.

**Auth implementation vs security concept (keep impl, cross-link):** `447` TOTP mechanics ↔
`cybersecurity/06`; `458` bcrypt/argon2 ↔ `cybersecurity/05`; `451` Node JWT ↔ `cybersecurity/26`.

**Web-perf vs framework track (keep framework-agnostic):** `437` SSR/CSR ↔ `nextjs/22`; `432`
image optimization ↔ `nextjs/17`; `438` bundle size ↔ react/nextjs perf. *Also flagged: `430`
CSP is mis-homed under Web-Perf — re-home to a security cluster.*

**Interview problem-sets vs the DSA track (link, don't re-teach):** `390`/`391`/`392` ↔ `dsa` &
`sql` tracks.

**Engineering-practice vs Git track:** `412` commit messages, `411` code review, `415` PR
structure ↔ `git/21`,`git/23`.

**Standalone Dart track vs Flutter's in-context Dart:** `361`–`368` ↔ `flutter/01-dart`,
`/06-dart-deep`, `/18-async-future`.

**Internal scope-discipline pairs (keep both, strict scope):** `204` PG-multitenant impl ↔ `493`
engine-agnostic multitenant modeling; `098` Deep-Learning concept ↔ `126` AI⊃ML⊃DL comparison;
`218` rate-limit algorithms ↔ `226` rate-limit design walkthrough; `228` SQL-vs-NoSQL ↔ `199`
PostgreSQL-vs-MongoDB.

**Thin-summary watch (must synthesize, not link-list):** the recurring "X best practices / X common
mistakes" structural pattern. `035` AWS security best-practices **failed this test → MERGE** (§9a).
Survivors kept with a hard synthesis guardrail: `068` K8s Security Best Practices (real hardening
guide — pod security standards, network policies, RBAC, secrets, image scanning; **demote to MERGE
if it only restates 057/069**); `177` Redis Security Best Practices (net-new, Redis-specific
hardening — the only Redis security page); `201` Secure PostgreSQL in Production (PG-specific:
`pg_hba.conf`, SCRAM, RLS). See [`docs/final-watchlist-audit.md`](final-watchlist-audit.md).

**Web-perf scope guardrails (final audit):** `437` SSR-vs-CSR — keep **framework-agnostic** (CSR/SSR
fundamentals, hydration, SEO, TTFB/TTI); clearly distinct from `nextjs/22-rendering-strategies`
(Next's SSG/SSR/ISR/streaming modes); re-home out of Web-Perf. `438` JS bundle-size — keep
**tooling-agnostic**; verify scope against `nextjs/23-deployment-optimization` before drafting.

---

## 10. Publishing waves

Waves are **pedagogically ordered** (you write a concept before its tutorial/troubleshooting
page), with `priority_score` ordering items *within* each wave. Full per-wave enumeration lives in
`content/data/content-backlog.json` (`publishing_wave` field).

| Wave | Theme | Count | Composition |
|---|---|---:|---|
| **1** | Foundations & new-domain pillars | 30 | every cluster's anchor P0 concept |
| **2** | Core concepts & first tutorials | 133 | beginner concepts + "hello-world" tutorials |
| **3** | Intermediate depth & practical guides | 113 | practical guides + **all troubleshooting** + intermediate tutorials |
| **4** | Advanced concepts & deep tutorials | 73 | advanced/niche topics |
| **5** | Projects & capstones | 16 | end-to-end build projects |
| **6** | Reference, cheat sheets & comparisons | 85 | supporting/decision-support pages |
| **7** | Exercises, quizzes & assessments | 40 | practice + assessment layer |

### Cluster × wave matrix

| Cluster | W1 | W2 | W3 | W4 | W5 | W6 | W7 |
|---|--:|--:|--:|--:|--:|--:|--:|
| AWS Cloud Foundations | 1 | 17 | 10 | 0 | 0 | 6 | 1 |
| Kubernetes & Orchestration | 2 | 17 | 6 | 6 | 0 | 3 | 0 |
| AI, ML & LLMs | 2 | 17 | 6 | 6 | 1 | 6 | 2 |
| SOC & Blue Team | 1 | 15 | 6 | 4 | 1 | 6 | 2 |
| Offensive Security / Pentest | 1 | 12 | 2 | 7 | 1 | 5 | 2 |
| Testing & Eng Practice | 2 | 11 | 6 | 0 | 1 | 3 | 2 |
| Terraform / IaC | 2 | 8 | 4 | 4 | 1 | 4 | 2 |
| System Design | 1 | 8 | 5 | 6 | 1 | 7 | 2 |
| PowerShell Scripting | 1 | 9 | 5 | 3 | 1 | 4 | 2 |
| Ruby | 2 | 9 | 2 | 1 | 1 | 3 | 2 |
| Redis & Caching | 2 | 5 | 5 | 2 | 1 | 3 | 2 |
| PostgreSQL Administration | 2 | 1 | 10 | 6 | 1 | 3 | 2 |
| OS & Computer Architecture | 1 | 1 | 10 | 5 | 0 | 5 | 2 |
| Web Performance & a11y | 2 | 0 | 8 | 5 | 1 | 2 | 2 |
| Auth & Identity | 1 | 0 | 7 | 2 | 1 | 4 | 2 |
| Interview & Career | 1 | 2 | 8 | 0 | 1 | 6 | 4 |
| Dart | 2 | 0 | 5 | 3 | 1 | 2 | 2 |
| Mobile Platforms | 1 | 0 | 2 | 5 | 1 | 4 | 2 |
| Compilers & Language Theory | 2 | 0 | 3 | 3 | 1 | 4 | 1 |
| Data Modeling & DB Design | 1 | 0 | 2 | 2 | 0 | 3 | 2 |
| Open Source & Collaboration | 0 | 1 | 1 | 3 | 0 | 2 | 2 |

### Wave 1 — Foundations (all 30, the recommended first sprint)

`TCF-000097` What Is Machine Learning? · `TCF-000398` What Is Unit Testing? · `TCF-000072` What Is
IaC? · `TCF-000001` What Is Cloud Computing? · `TCF-000038` Kubernetes Architecture · `TCF-000073`
What Is Terraform? · `TCF-000207` What Is System Design? · `TCF-000276` What Is a SOC? ·
`TCF-000312` Phases of a Pen Test · `TCF-000376` How Tech Interviews Work · `TCF-000399` The
Testing Pyramid · `TCF-000138` PowerShell Cmdlets · `TCF-000162` What Is Redis? · `TCF-000163`
Redis Data Types · `TCF-000341` What Is Ruby? · `TCF-000342` Ruby's OO Nature · `TCF-000037` What
Is Kubernetes? · `TCF-000098` What Is Deep Learning? · `TCF-000183` PostgreSQL Schemas ·
`TCF-000488` ER Modeling · `TCF-000238` CPU Scheduling · `TCF-000261` What Is a Compiler? ·
`TCF-000262` Lexical Analysis · `TCF-000423` What Is Web Performance? · `TCF-000464` Mobile App
Lifecycle · `TCF-000443` What Is OAuth 2.0? · `TCF-000182` PostgreSQL MVCC · `TCF-000424` Core Web
Vitals · `TCF-000361` What Is Dart? · `TCF-000362` Dart Null Safety.

---

## 11. Major content gaps discovered (top 10)

These are the **domain-level holes in the site** that the batch exposes — the strategic reason to
run these clusters at all (ranked by career demand × dependency × gap size):

1. **Cloud / AWS** — the single biggest missing career track; 36 candidates, zero existing coverage.
2. **AI, ML & LLMs** — highest-demand topic of 2026 and the largest dependency hub (`097`); 40 candidates.
3. **Kubernetes & orchestration** — only a shallow `devops/22` intro exists today.
4. **System Design & distributed systems** — critical for senior interviews; only tangentially in the microservices track.
5. **Terraform / IaC** — one lesson (`devops/12`) covers what deserves a 25-page cluster.
6. **SOC / Blue Team / Forensics** — the *defensive-operations* half of security (site has defensive *coding*, not SOC ops).
7. **Offensive security / pentest** — the *offensive* half; site has only a defensive posture.
8. **Software testing & engineering practice** — `398 Unit Testing` is a 24-dependent hub; only React-component testing exists.
9. **Auth & identity (OAuth/OIDC/passkeys/RBAC-vs-ABAC)** — scattered across two security tracks, never taught as a coherent path.
10. **OS & computer-architecture theory** — CS-fundamentals depth the practical Linux track never covers (processes/threads, scheduling, virtual memory, concurrency).

*Runners-up:* PostgreSQL administration depth, Redis/caching, PowerShell, Data-modeling, Ruby,
Dart-as-a-language, Compilers, Web-performance/a11y, Interview-prep, Mobile-platform ops, Open-source.

---

## 12. Top cannibalization risks (watch-list)

Ranked by likelihood of two pages competing for the same query if scope discipline slips:

1. **New canonical concept vs existing shallow lesson** — `037`/`072` vs `devops/22`,`devops/12`.
   *Action:* update the DevOps lessons to cross-link/narrow once the new pillars ship.
2. **Offense/defense injection overlap** — `329`,`323` vs `cybersecurity`/`api-security`/`sql`.
   *Action:* enforce offensive-lab vs defensive-coding framing; reciprocal cross-links.
3. **AWS-service pages vs System-Design concepts** — `012`/`015`/`021` vs `219`/`215`/`209`.
   *Action:* concept page is canonical; AWS page links it, doesn't re-explain the concept.
4. **Internal near-duplicate pairs** — `204`↔`493`, `098`↔`126`, `218`↔`226`, `228`↔`199`.
   *Action:* lock each page's angle at drafting time per its guardrail.
5. **Web-perf vs Next.js track** — `437`/`432`/`438` vs `nextjs/*`.
   *Action:* keep framework-agnostic; and **re-home `430` CSP out of Web-Perf into security**.
6. **Interview problem-sets vs DSA track** — `390`/`391`/`392`. *Action:* link, never re-teach.
7. **Standalone Dart vs Flutter's Dart lessons** — `361`–`368` vs `flutter/01,06,18`.

---

## 13. Recommended next actions

1. **Human-review the 6 MERGE/UPDATE decisions** (§9a/9b) — these touch *existing live pages*, so
   a maintainer should confirm before any edit. Highest-priority human sign-off item.
2. **Prioritize human technical review** (§22) for the two security clusters before drafting —
   **SOC & Blue Team (35)** and **Offensive Security / Pentest (30)** are the highest-risk content
   on the site; nothing here publishes without a security reviewer.
3. **Do NOT auto-scaffold new tracks from this list.** Per the backlog README, a *new track* must
   go through the `create-new-track` process; gaps in *existing* tracks go through
   `fill-content-gaps`. This roadmap plans the content; it does not authorize scaffolding.
4. **Produce Wave 1 first** (30 pillars). They unblock everything (`097`, `398`, `072` alone gate
   87 downstream pages). Suggested order within Wave 1: the three dependency hubs, then one anchor
   per remaining cluster.
5. **Then run clusters, not waves, end-to-end** for the 3–4 highest-gap clusters (AWS, AI/LLMs,
   Kubernetes, System Design) so each ships as a *complete learning ecosystem* (§29) rather than
   scattered pages — better for both learners and topical authority.
6. **Re-home `TCF-000430` (CSP)** out of Web-Performance into a security cluster before drafting.
7. **Batch 002 planning:** shift the content-type mix toward Tutorial/Practical/Troubleshooting to
   fill the practice + assessment layers of clusters this batch only seeded conceptually.
8. **Per-page, at drafting time:** re-run the §7 test against the *live* inventory (this pass
   sampled existing lesson titles, not all ~1,900 pieces), validate code (§11), and add the
   outward cross-link named in each record's `cannibalization_risk`.

---

## 14. Quality-gate verification (§18)

| Check | Status |
|---|---|
| No obvious duplicate topics remain in CREATE | ✅ 6 merges (5 intent-duplicates + 1 thin aggregation, `035`); 47 near-overlaps kept with explicit scope guardrails |
| No obvious cannibalizing pages remain unresolved | ✅ every overlap → MERGE / UPDATE / documented guardrail |
| No topic rejected solely for low search volume | ✅ REJECT = 0; volume is not a scoring input |
| No topic approved solely because a keyword exists | ✅ approvals rest on educational purpose + architecture fit; top ranks are prereq hubs |
| Every CREATE has a clear educational purpose | ✅ passes §7 educational-value + depth |
| Every CREATE has a place in the architecture | ✅ 21 clusters; parent/child/prereq/next-step on every record |
| Every MERGE has a destination | ✅ 6/6 (`merge_into`) |
| Every UPDATE identifies the page to update | ✅ 1/1 (`devops/10-semantic-versioning.mdx`) |
| Every REJECT has a reason | ✅ n/a (0 rejects; rationale in §4) |
| Priority scores are explainable | ✅ `score_breakdown` sums exactly to `priority_score` on all 497 |
| Roadmap internally consistent | ✅ 490 + 6 + 1 = 497; wave sizes sum to 490 CREATE |

---

## 15. Traceability & machine-readable dataset

- **Originals preserved:** `docs/content-backlog/batch-001.json` is untouched; every `TCF-` id is
  carried into the output with `original_title`.
- **Decision dataset:** [`content/data/content-backlog.json`](../content/data/content-backlog.json)
  — 497 records, one per candidate. Schema:

```jsonc
{
  "id", "original_title", "normalized_title", "topic_key",
  "status",               // CREATE | MERGE | UPDATE  (REJECT unused this batch)
  "decision_reason",
  "merge_into",           // destination for MERGE/UPDATE, else null
  "content_type", "intent", "domain", "category", "cluster", "difficulty",
  "priority_score",       // 0-100
  "priority_band",        // original P0-P3 hint
  "score_breakdown",      // 10 factors, sum == priority_score
  "dependency_indegree",  // # of candidates that depend on this one
  "publishing_wave",      // 1-7 for CREATE, else null
  "parent_topic", "child_topics", "prerequisites", "related_topics",
  "next_learning_step",
  "cannibalization_risk"  // guardrail note or RESOLVED-via-MERGE/UPDATE
}
```

- **Generator:** [`scripts/build-content-backlog.mjs`](../scripts/build-content-backlog.mjs) —
  run `node scripts/build-content-backlog.mjs` to regenerate `content/data/content-backlog.json`
  deterministically from `batch-001.json`. All scoring weights and MERGE/UPDATE/cannibalization
  overrides live in that file, so every decision is reproducible and auditable; re-running with a
  changed candidate set re-scores and re-sequences the whole backlog.

---

*No article bodies were generated in this phase. 497 candidates → validated knowledge architecture
→ deduplicated backlog → prioritized, wave-sequenced roadmap → production-ready content system.*
