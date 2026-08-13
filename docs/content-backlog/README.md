# Content Backlog — Master Index

Candidate content topics for The Code Fix, generated per the process in
[`docs/content-guidelines.md`](../content-guidelines.md). Each batch is a
JSON array of structured records (id, title, category, subcategory,
content_type, difficulty, search_intent, primary_topic, parent_topic,
prerequisites, related_topics, unique_value, duplicate_check, status,
priority).

**These are candidate topics, not finished content.** `STATUS: APPROVED`
means the title passed the page-existence test and isn't a duplicate of
anything currently on the site — not that the page is written or ready to
publish. Writing the actual page (research, verification, code examples,
Arabic prose) still has to happen per the quality bar in the content
guidelines, and every topic should get a final look against the live
inventory before it's actually drafted (this list was cross-checked against
sampled lesson titles, not every one of the ~1,900 pieces of content
individually).

## Batch 001

- File: [`batch-001.json`](batch-001.json)
- Candidates: 497 (target was ~500; landed at 497 rather than padding to an exact round number)
- Approved: 497 · Duplicates: 0 · Rejected: 0 · Needs review: 0
- Counters: [`batch-001-counters.json`](batch-001-counters.json)

### Scope decision

The site already has 34 tracks / 1,055 lessons / 744 reference entries / 93
blog posts (checked directly against `src/content/` before drafting this
batch). At that depth, finding thousands more genuinely distinct topics
*within* existing tracks isn't realistic without resorting to the kind of
thin, reworded duplicates the guidelines explicitly reject. So batch 001
leans into two buckets:

1. **New domains with no existing track** — Cloud/AWS, Kubernetes, Terraform/IaC,
   AI/ML & LLMs, PowerShell, Redis, System Design, Computer Architecture/OS
   theory, Compilers, SOC/Blue Team/Forensics, Penetration Testing, Ruby,
   Dart, Interview Prep, Software Testing practice, Web Performance/a11y,
   Auth/AuthZ, Mobile beyond Flutter, Open Source collaboration, Database
   design.
2. **Genuinely distinct depth** in areas the existing tracks only touch
   lightly (e.g. PostgreSQL-specific administration vs the generic SQL
   track's syntax focus).

### Domain breakdown

| Domain | Candidates |
|---|---|
| AI, Machine Learning & LLMs | 40 |
| Cloud Computing (AWS) | 36 |
| Kubernetes | 35 |
| SOC, Blue Team & Digital Forensics | 35 |
| System Design & Distributed Systems | 30 |
| Penetration Testing & Ethical Hacking | 30 |
| Computer Architecture & OS Theory | 24 |
| Terraform & Infrastructure as Code | 25 |
| PowerShell | 25 |
| PostgreSQL (Advanced) | 25 |
| Software Testing & Engineering Practice | 25 |
| Interview Preparation & Career | 22 |
| Redis | 20 |
| Ruby | 20 |
| Web Performance & Accessibility | 20 |
| Authentication & Authorization | 20 |
| Compilers & Language Theory | 15 |
| Dart | 15 |
| Mobile Development Beyond Flutter | 15 |
| Database Design & Data Modeling | 10 |
| Open Source & Collaboration | 10 |

### Content-type distribution (this batch)

Concept 172 (35%) · Tutorial 90 (18%) · Comparison 61 (12%) · Practical
Guide 43 (9%) · Technical Article 29 (6%) · Exercise 21 (4%) ·
Troubleshooting 19 (4%) · Quiz 19 (4%) · Project 16 (3%) · Reference 15 (3%)
· Cheat Sheet 12 (2%).

Skews more concept-heavy than the guidelines' 20% target — most of these
domains are entirely new to the site, so establishing the foundational
"what is X" layer genuinely comes first for a lot of them. Later batches
going deeper into these same domains should shift toward tutorial/practical/
troubleshooting.

### Known gaps in this pass

- `unique_value` is a light template derived from the title, not a bespoke
  sentence per item — the title/categorization is the vetted part; expand
  `unique_value` when a topic is actually picked up for drafting.
- Duplicate-checking was done against sampled existing lesson titles for the
  densest tracks (Python, JS, Docker, SQL, Linux, Networking, Git,
  Cybersecurity, DevOps, React, TypeScript, Node.js, OOP, REST API) plus
  general judgment for the rest — not a title-by-title diff against all
  ~1,900 existing pieces.
- No entirely new *track* should get scaffolded from this list without going
  through `create-new-track`; gaps in *existing* tracks should go through
  `fill-content-gaps`.

## Master counters (running total across all batches)

| | |
|---|---|
| Total candidates | 497 |
| Total approved | 497 |
| Total duplicates | 0 |
| Total rejected | 0 |
| Total needs review | 0 |

Next batch starts IDs at `TCF-000498`.
