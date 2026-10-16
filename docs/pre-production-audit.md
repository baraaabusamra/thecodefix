# Pre-Production Quality Audit — Batch 001 CREATE candidates

**Purpose:** independently stress-test the 491 records marked `CREATE` in
[`content/data/content-backlog.json`](../content/data/content-backlog.json) *before* any article
is written, to confirm each truly means **"this topic deserves its own independent URL and
provides distinct user/learning value"** — not merely "another URL."

**Posture:** adversarial. The goal was to **disprove** `CREATE`, not to ratify the pipeline. A
topic was demoted for being a reworded sibling, too narrow for its own page, already served by an
existing page, or lacking standalone value — regardless of keyword, search potential, W3Schools
resemblance, or cluster fit.

**Scope:** audit only. The original 497 candidates and the 491 `CREATE` decisions were **not
modified**. Recommendations here are proposals for human sign-off.

**Grounding:** every cannibalization check is against the *actual* live inventory — 34 tracks and
their real lesson slugs (`content/ar/tracks/**`), 31 quizzes, and reference sections. No existing
page was invented.

---

## 1. Methodology

1. **Built the ground-truth inventory** — enumerated every lesson slug across all 34 existing
   tracks so overlap claims cite real pages (e.g. `nextjs/22-rendering-strategies`,
   `devops/12-iac`, `cybersecurity/16-incident-response`, `flutter/06-dart-deep`).
2. **Drew a stratified sample of 50** from the 491 `CREATE` records (not the first 50). Sampling
   used **greedy multi-dimensional stratification**: fixed allocation per cluster (3 to the 8
   largest clusters, 2 to the other 13 = 50), then within each cluster greedily picked the record
   that most improved global balance across **content type × difficulty × priority band**.
   Deterministic and reproducible.
3. **Re-ran the §7 page-existence test independently** on each of the 50 — unique intent, unique
   educational value, standalone depth, "should this be a section of another page?", semantic
   overlap with existing site pages, semantic overlap with other `CREATE` candidates,
   cannibalization risk, and whether a separate URL is genuinely justified — assigning a fresh
   verdict (`CREATE` / `MERGE` / `UPDATE` / `REJECT`) + confidence, ignoring the prior label.
4. **Reviewed all 30 Wave 1 pillars** separately (they anchor everything downstream).
5. **Computed the validation rate** and applied the 15% critical threshold.

**Why this sample is fair-to-strict:** it deliberately over-weights the *supporting* content types
(comparison, cheat sheet, quiz, reference, glossary, best-practices) relative to the
concept-heavy population, because those are the types most prone to thinness and duplication. If
over-approval existed, this sample is biased to catch it.

---

## 2. Sample composition (50 of 491 CREATE)

| Dimension | Distribution |
|---|---|
| **Clusters** | all **21** represented (≥2 each; 3 from each of the 8 largest) |
| **Content type** | Concept 7 · Comparison 6 · Practical Guide 5 · Quiz 5 · Tutorial 4 · Technical Article 4 · Cheat Sheet 4 · Reference 4 · Project 4 · Exercise 4 · Troubleshooting 3 |
| **Difficulty** | Beginner 20 · Intermediate 17 · Advanced 13 |
| **Priority band** | P0 7 · P1 20 · P2 14 · P3 9 |

---

## 3. The 50 audited topics

Legend — **New decision** `✓` = CREATE confirmed. Confidence 0–1 (independent re-verdict certainty).

| # | ID | Title | Cluster | Type/Diff/Band | Orig | New | Δ | Reason (grounded) | Cannibalization | Canonical/parent | Conf |
|--:|---|---|---|---|---|---|:--:|---|---|---|--:|
| 1 | 026 | Common AWS CLI Commands Cheat Sheet | AWS | CheatSheet/B/P2 | CREATE | CREATE | — | Reference-type lookup value; AWS is net-new (no AWS track exists). | None | — | .85 |
| 2 | 028 | Troubleshoot an EC2 You Can't SSH Into | AWS | Trbl/I/P1 | CREATE | CREATE | — | Distinct high-intent error scenario; net-new. | None | — | .95 |
| 3 | 035 | AWS Security Best Practices for Beginners | AWS | TechArt/B/P3 | CREATE | **MERGE** | ✅ | Thin roundup — restates 010 (shared responsibility), 018 (IAM least-priv), 034 (secure S3); little unique standalone value. | Internal: 010/018/034 | **→ fold into 010 + 018 + 034** | .60 |
| 4 | 037 | What Is Kubernetes? | K8s | Concept/B/P0 | CREATE | CREATE | — | `devops/22-kubernetes-intro` is a one-lesson touchpoint; a dedicated K8s track needs a canonical pillar. | Existing: devops/22 | pillar; update devops/22 to cross-link | .85 |
| 5 | 058 | Configure Autoscaling for a K8s Deployment | K8s | Tut/A/P1 | CREATE | CREATE | — | Specific HPA how-to; pairs with concept 049; net-new. | None | 049 (concept) | .90 |
| 6 | 071 | Common K8s Deployment Mistakes | K8s | TechArt/I/P3 | CREATE | CREATE | — | Anti-pattern/design guidance distinct from single-error troubleshooting (063–065). **Watch:** must synthesize, not restate. | Internal (mild): 063–065 | — | .65 |
| 7 | 072 | What Is Infrastructure as Code? | IaC | Concept/B/P0 | CREATE | CREATE | — | 24-dependent hub; `devops/12-iac` is one lesson, not a canonical concept. | Existing: devops/12 | pillar; narrow/cross-link devops/12 | .85 |
| 8 | 088 | Terraform vs AWS CloudFormation | IaC | Comp/I/P2 | CREATE | CREATE | — | Net-new decision-support comparison; no existing page compares these. | None | — | .90 |
| 9 | 097 | What Is Machine Learning? | AI/ML | Concept/B/P0 | CREATE | CREATE | — | Highest-dependency hub (39); net-new domain. | None | — | .98 |
| 10 | 114 | Few-Shot vs Zero-Shot Prompting | AI/ML | Comp/I/P2 | CREATE | CREATE | — | Recognized distinct comparison w/ own search intent. **Watch:** narrow — could become a section of 113. | Internal (mild): 112/113 | 113 | .60 |
| 11 | 119 | Build a RAG Pipeline with a Vector DB | AI/ML | Tut/A/P1 | CREATE | CREATE | — | High-value advanced tutorial; distinct from concept 107. | None | 107 (concept) | .92 |
| 12 | 156 | Manage Active Directory with PowerShell | PowerShell | Prac/A/P1 | CREATE | CREATE | — | Specific practical use case; net-new. | None | — | .90 |
| 13 | 158 | PowerShell Scripting Exercises (Beginner) | PowerShell | Ex/B/P1 | CREATE | CREATE | — | Assessment-layer page; net-new. | None | — | .85 |
| 14 | 160 | PowerShell Fundamentals Quiz | PowerShell | Quiz/B/P3 | CREATE | CREATE | — | Legit assessment type (site has 31 quizzes); net-new track. | None | — | .85 |
| 15 | 170 | Use Redis as a Session Store | Redis | Tut/I/P1 | CREATE | CREATE | — | Specific tutorial; net-new. | None | — | .90 |
| 16 | 172 | Redis Commands Cheat Sheet | Redis | CheatSheet/B/P2 | CREATE | CREATE | — | Reference lookup value; net-new. | None | — | .85 |
| 17 | 182 | PostgreSQL MVCC | PostgreSQL | Concept/A/P0 | CREATE | CREATE | — | PG-specific concurrency concept; not in generic `sql` track. **Wave-1 seq note (§7).** | Low vs sql | — | .90 |
| 18 | 194 | PostgreSQL psql Commands Cheat Sheet | PostgreSQL | CheatSheet/B/P2 | CREATE | CREATE | — | psql-specific reference; not in `sql` track. | Low vs sql | — | .85 |
| 19 | 195 | Fix PostgreSQL "Too Many Connections" | PostgreSQL | Trbl/I/P1 | CREATE | CREATE | — | Specific PG error; net-new. | None | — | .92 |
| 20 | 208 | Horizontal vs Vertical Scaling | SystemDesign | Comp/B/P2 | CREATE | CREATE | — | Canonical general scaling concept; not in existing tracks. | None | — | .90 |
| 21 | 234 | Design a Scalable Notification System | SystemDesign | Proj/A/P1 | CREATE | CREATE | — | Capstone design project; net-new. | None | — | .90 |
| 22 | 235 | System Design Fundamentals Quiz | SystemDesign | Quiz/I/P3 | CREATE | CREATE | — | Cluster assessment; net-new. | None | — | .82 |
| 23 | 257 | CPU Scheduling Algorithm Practice Problems | OS | Ex/I/P1 | CREATE | CREATE | — | Exercise paired w/ concept 238; OS theory net-new. | None | 238 | .85 |
| 24 | 259 | Diagnose a Deadlock in a Multithreaded App | OS | Trbl/A/P1 | CREATE | CREATE | — | App-level debugging distinct from OS concept 240 and PG deadlocks 197. | None | 240 | .85 |
| 25 | 264 | Parsing: Top-Down vs Bottom-Up | Compilers | Comp/A/P2 | CREATE | CREATE | — | Distinct compiler concept; net-new domain. | None | 261 | .85 |
| 26 | 272 | Build a Simple Calculator Interpreter | Compilers | Prac/I/P1 | CREATE | CREATE | — | Beginner project; sequences into advanced 274. | None | 274 | .85 |
| 27 | 294 | Analyze a Suspicious File Safely | SOC | Prac/A/P1 | CREATE | CREATE | — | Malware-ops content; `cybersecurity` track is defensive-coding, not SOC ops. **Security review.** | None | — | .85 |
| 28 | 303 | MITRE ATT&CK Tactics Reference | SOC | Ref/I/P2 | CREATE | CREATE | — | External-framework reference; pairs concept 287. | None | 287 | .85 |
| 29 | 308 | Incident Response Fundamentals Quiz | SOC | Quiz/B/P3 | CREATE | CREATE | — | Assessment (different type from `cybersecurity/16` lesson). Cross-link it. **Security review.** | Existing (mild): cybersecurity/16 | cross-link cybersecurity/16 | .75 |
| 30 | 333 | OWASP Testing Guide Overview | Pentest | Ref/I/P2 | CREATE | CREATE | — | WSTG ≠ Top 10 (`cybersecurity/07`) ≠ ASVS (`api-security/20`) — genuinely different OWASP doc. Cross-link to disambiguate. **Security review.** | Existing (mild): cybersecurity/07, api-security/20 | cross-link both | .72 |
| 31 | 336 | Beginner CTF Practice Challenges | Pentest | Ex/B/P1 | CREATE | CREATE | — | Distinct hands-on exercise; net-new. **Security review.** | None | — | .85 |
| 32 | 337 | Complete a Full Pen Test on a Lab Machine | Pentest | Proj/A/P1 | CREATE | CREATE | — | Capstone project; net-new. **Security review.** | None | — | .88 |
| 33 | 341 | What Is Ruby? | Ruby | Concept/B/P0 | CREATE | CREATE | — | Net-new language pillar. | None | — | .95 |
| 34 | 360 | Ruby Fundamentals Quiz | Ruby | Quiz/B/P3 | CREATE | CREATE | — | Cluster assessment; net-new. | None | — | .82 |
| 35 | 362 | Understanding Dart's Null Safety | Dart | Concept/I/P0 | CREATE | CREATE | — | **Top watch item.** `flutter/06-dart-deep` likely covers this in-context; standalone justified only under the "separate language track" model (as `kotlin` sits beside `flutter`). Verify overlap before drafting. | Existing: flutter/06-dart-deep | cross-link Flutter; 361 | .55 |
| 36 | 371 | Dart Syntax Cheat Sheet | Dart | CheatSheet/B/P2 | CREATE | CREATE | — | Reference lookup; net-new language. | Low vs flutter | — | .80 |
| 37 | 382 | Negotiate a SWE Job Offer | Interview | Prac/I/P1 | CREATE | CREATE | — | Net-new career content; no existing coverage. | None | — | .90 |
| 38 | 395 | Build a Resume-Worthy Portfolio Project | Interview | Proj/I/P1 | CREATE | CREATE | — | Build-deliverable distinct from advice page 384. **Watch:** cross-link 384, don't duplicate advice. | Internal (mild): 384 | 384 | .65 |
| 39 | 416 | Common Testing Terminology Glossary | Testing | Ref/B/P2 | CREATE | CREATE | — | Glossary = distinct lookup intent from learning pages 398–405. **Watch:** thinness — must be genuine reference. | Internal (mild): 398–405 | — | .65 |
| 40 | 422 | Common Testing Anti-Patterns | Testing | TechArt/I/P3 | CREATE | CREATE | — | Anti-pattern awareness distinct from concept pages; partial overlap w/ 405 (flaky tests). | Internal (mild): 405 | — | .70 |
| 41 | 437 | SSR vs CSR: Performance Tradeoffs | WebPerf | Comp/I/P2 | CREATE | **MERGE** | ✅ | Core already covered in depth by `nextjs/22-rendering-strategies` (+ `nextjs/02-server-client`); low marginal standalone value. Lowest score in batch (56). | Existing: nextjs/22 | **→ nextjs/22-rendering-strategies** + cross-link web-perf pillar 423 | .60 |
| 42 | 442 | Common Web Accessibility Mistakes | WebPerf | TechArt/B/P3 | CREATE | CREATE | — | Anti-pattern framing distinct from `html/21-accessibility`; standalone search value. **Watch:** cross-link html/21. | Existing (mild): html/21-accessibility | cross-link html/21 | .60 |
| 43 | 453 | Implement Refresh Token Rotation | Auth | Tut/A/P1 | CREATE | CREATE | — | Advanced technique not covered by intro auth lessons (`nodejs/18`, `rest-api/13`, `cybersecurity/26`). **Security review.** | Low | — | .80 |
| 44 | 460 | Build a Complete Auth System w/ Refresh Tokens | Auth | Proj/A/P1 | CREATE | CREATE | — | Capstone project (distinct from framework auth lessons). **Watch:** heavy cross-link; **security review.** | Existing (mild): django/16-17, laravel/15-16, nodejs/18 | 443/451/452 | .65 |
| 45 | 473 | Mobile App Store Review Guidelines | Mobile | Ref/B/P2 | CREATE | CREATE | — | Reference content; net-new (not in flutter/kotlin/swift). | Low | — | .78 |
| 46 | 477 | Mobile Development Fundamentals Quiz | Mobile | Quiz/B/P3 | CREATE | CREATE | — | Cross-platform-concepts assessment, distinct from language quizzes. | Low vs flutter/kotlin/swift | — | .70 |
| 47 | 482 | Manage Breaking Changes in a Public API/Library | OpenSource | Prac/A/P1 | CREATE | CREATE | — | API-evolution/deprecation strategy distinct from SemVer definition (481). | Internal (mild): 481 | cross-link 481, devops/10 | .80 |
| 48 | 485 | Structure a Monorepo vs Multi-Repo | OpenSource | Comp/A/P2 | CREATE | CREATE | — | Net-new comparison; no existing coverage. | None | — | .82 |
| 49 | 488 | What Is Entity-Relationship (ER) Modeling? | DataModeling | Concept/B/P0 | CREATE | CREATE | — | ER modeling ≠ normalization (`sql/20`) ≠ document modeling (`mongodb/15`). Distinct pillar. | Low vs sql/mongodb | cross-link sql/20, mongodb/15 | .80 |
| 50 | 496 | Database Schema Design Exercises | DataModeling | Ex/I/P1 | CREATE | CREATE | — | Cluster exercise; net-new. | Low | 488 | .80 |

---

## 4. Validation rate

| Outcome | Count | % |
|---|--:|--:|
| **CREATE confirmed** | **48** | **96%** |
| CREATE → MERGE | 2 | 4% |
| CREATE → UPDATE | 0 | 0% |
| CREATE → REJECT | 0 | 0% |
| **Total audited** | **50** | 100% |

**Validation rate: 96%. Independent-test failure rate: 4%.**

This is the *actual* result, not a target. The two demotions are both **MERGE** (each has a
concrete destination); nothing in the sample was so valueless as to warrant **REJECT**, and no
sampled candidate was better served purely by **UPDATE**. Average confidence across the 50 ≈ **0.81**.

### The 2 demotions (detail)

- **035 — AWS Security Best Practices for Beginners → MERGE.** A beginner "best practices" roundup
  whose substance is already promised by three sibling candidates: `010` Shared Responsibility
  Model, `018` IAM least-privilege, `034` secure-S3. Distributing its points into those pages (with
  a short security-orientation note on `010`) removes a redundant URL. *This is the head of a
  structural pattern* — see §6.
- **437 — SSR vs CSR: Performance Tradeoffs → MERGE.** The rendering-strategy tradeoff is already
  taught in depth by the live `nextjs/22-rendering-strategies` (plus `nextjs/02-server-client`,
  `nextjs/10/11` server/client components). A separate general page mostly re-explains it.
  Canonical = `nextjs/22`; the web-perf pillar `423` should cross-link it rather than a new URL.

---

## 5. Critical-threshold verdict

> Threshold: **STOP if > 15%** of audited CREATE candidates fail the independent test.

**Failure rate = 4% (2/50), well under 15%.**

✅ **Production may proceed to Wave 1** after the two changed decisions (035, 437) are reviewed and
the §6 watch-list guardrails are applied at drafting time. No pipeline-wide re-run or rebuild is
required.

*(Had it exceeded 15%, the remediation would have been: diagnose over-approval, tighten the
`CREATE` rule — most likely by auto-demoting broad "best practices/overview/glossary" summaries and
any candidate with >0.5 token-overlap to a deep existing lesson — then re-validate all 491 and
reissue the roadmap. That path is **not** triggered.)*

---

## 6. Main failure & risk patterns

Only two patterns produced actual demotions; the rest are **watch items** (confirmed CREATE at
confidence ≤ 0.70) that need a scope guardrail, not removal.

1. **Thin "best-practices / overview" aggregation** *(caused 035).* Broad summary pages that mostly
   restate specific sibling pages. **Sweep the whole backlog for the twins of 035** before drafting:
   `068` K8s Security Best Practices, `177` Redis Security Best Practices, `201` Secure PostgreSQL,
   `035` AWS Security Best Practices, `023-style` "X best practices" pages. Rule to apply: keep only
   if it *synthesizes* (decision framework, prioritized checklist) rather than links; otherwise MERGE.
2. **Cross-track cannibalization with a *deep* existing lesson** *(caused 437).* A general concept
   whose core is already covered in depth by a framework track. Others to re-check with the same
   lens: `432` image optimization vs `nextjs/17`, `438` bundle size vs react/nextjs perf,
   `362`/Dart-language pages vs `flutter/06-dart-deep`.
3. **Narrowness — "should be a section"** *(watch: 114 few-shot-vs-zero-shot, 416 testing glossary,
   422 anti-patterns).* Defensible as standalone under the site's granular model, but must clear the
   depth bar at drafting or fold into the parent concept.
4. **Assessment/reference overlap** *(watch: 308 IR quiz, 333 OWASP WSTG, 473 store guidelines).*
   Different *content type* from the existing lesson, so not true cannibalization — but must
   cross-link the existing page to avoid intent confusion.

None of these is systemic over-approval; the pipeline's `CREATE` set is sound at a 96% independent
confirmation rate.

---

## 7. Wave 1 review — all 30 foundation pillars

Every Wave 1 record is a **Concept, P0, cluster-anchor** page. Checked each against the six Wave-1
criteria (distinct purpose · actually foundational · clear prerequisites · meaningful child topics ·
standalone URL justified · no cannibalization of an existing page).

**Result: 30/30 APPROVED as standalone foundation pillars.** All 21 clusters are anchored (10
clusters carry two pillars). No Wave-1 page fails the standalone-URL test.

**Three notes to apply before/at drafting (not blockers):**

1. **Two carry managed cannibalization guardrails** (already tracked): `037` What Is Kubernetes vs
   `devops/22-kubernetes-intro`, and `072` What Is IaC vs `devops/12-iac`. **Action:** ship a
   cross-link/narrowing edit to those two DevOps lessons in the same change as the new pillars, so
   the site never has two "what is K8s/IaC" pages competing.
2. **Two intra-cluster sequencing fixes** (both pillars stay in Wave 1; only the learner-facing
   order changes):
   - *PostgreSQL:* lead the path with `183` Schemas (Beginner) and installation, **then** `182`
     MVCC (Advanced). MVCC is foundational to PG but is not the gentlest first page.
   - *Dart:* `361` What Is Dart **before** `362` Null Safety.
3. **One cluster has no concept pillar in Wave 1:** *Open Source & Collaboration* — its natural
   entry points are a Wave-2 tutorial (`478` first contribution) and `481` SemVer (which is an
   UPDATE → `devops/10`, see §8). Acceptable for a practice-oriented cluster, but note it has no
   "what is X" anchor by design.
4. `098` Deep Learning overlaps `126` (AI⊃ML⊃DL comparison) — keep both per the existing guardrail
   (concept vs terminology-comparison), cross-link.

---

## 8. Human sign-off items

### 8a. The 6 pre-identified MERGE/UPDATE decisions (confirm before touching live pages)

These edit or retire *existing* pages / merge candidates and should be maintainer-approved. This
audit **re-confirms all six**:

| Decision | Type | This audit's view |
|---|---|---|
| `066` → `docker/26-swarm-vs-k8s` (existing) | MERGE | Confirm — comparison already exists; expand the live lesson. |
| `270` → `265` (Compiler vs Interpreter) | MERGE | Confirm — intent-duplicate. |
| `454` → `446` (Session vs Token auth) | MERGE | Confirm — same comparison axis. |
| `449` → `448` (Passkeys/passwordless) | MERGE | Confirm — passkey is the concrete case. |
| `462` → `457` (Auth vulns/mistakes) | MERGE | Confirm — same intent. |
| `481` → `devops/10-semantic-versioning` (existing) | UPDATE | Confirm — extend the live SemVer lesson. |

> Plus **two new MERGE candidates from this audit** to add to the same review queue: **`035` →
> 010/018/034** and **`437` → `nextjs/22-rendering-strategies`**.

### 8b. Security-heavy clusters — mandatory technical review before publication (§22)

No page in these clusters publishes without a security reviewer. Flagged clusters/candidates:

- **SOC & Blue Team** (35) — incl. sampled `294` analyze-suspicious-file, `308` IR quiz.
- **Penetration Testing / Offensive Security** (30) — incl. sampled `333` WSTG, `336` CTF, `337`
  full-pentest project; and unsampled offensive pages `329` SQLi-exploit-lab, `331` privilege
  escalation, `320` buffer overflow, `321` fuzzing, `317` reverse shell.
- **Authentication / Identity** (17) — incl. sampled `453` refresh-token rotation, `460` auth
  capstone; and `447` TOTP, `451` JWT, `458` password hashing.
- **API Security (existing track)** — the reference point for offense/defense differentiation; its
  live lessons (`api-security/16-penetration-testing`, `/04-sql-injection`) must be cross-linked
  from the new offensive pages so defense and offense stay clearly separated.

---

## 9. Executive summary

- **50 audited** (stratified across all 21 clusters, 11 content types, 3 difficulty levels, 4
  priority bands).
- **Confirmed CREATE: 48 · MERGE: 2 · UPDATE: 0 · REJECT: 0.**
- **Validation rate: 96% (failure rate 4%).**
- **Main failure patterns:** (1) thin "best-practices/overview" aggregation (035 — has ~4 twins to
  sweep); (2) cross-track cannibalization with a deep existing lesson (437 vs `nextjs/22`).
- **Production: PROCEED.** 4% is well under the 15% stop-threshold; no rebuild required — just apply
  the two demotions and the §6 watch-list guardrails at drafting.
- **Wave 1 (30 pillars): APPROVED** — all 30 are genuine standalone foundation anchors, subject to
  two DevOps cross-link edits (037/072) and two intra-cluster sequencing tweaks (PostgreSQL, Dart).

**Bottom line:** the `CREATE` set holds up under adversarial review — this is a plan for **491
genuinely distinct resources**, not 491 URLs. Recommended next step: sweep the four "X Best
Practices" twins of 035 and the deep-lesson overlaps of 437, then begin Wave 1 production with a
security reviewer engaged for the SOC/Pentest/Auth clusters.

---

*Audit only — no article bodies were written, and neither the 497 candidates nor the 491 CREATE
decisions were modified. Findings are proposals for human sign-off.*
