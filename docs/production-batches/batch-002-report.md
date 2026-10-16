# Production Batch Report — 002

**Wave 2 · AWS first-tutorial cluster** — 6 hands-on tutorials, each building on a completed Wave-2
AWS concept page. Second report under `docs/production-batches/`.

**Date:** 2026-08-14 · **Wave:** 2 · **Cluster:** AWS Cloud Foundations (tutorials) · **Pages:** 6 ·
**Status:** production-ready, **unpublished** · **Security-held excluded:** `443/276/312`.

**Selection rationale:** prerequisites satisfied (concept pages `003/004/006/008/011` produced in
batch W2-001), so per instruction the AWS first-tutorial cluster was selected. Chose the 6 tutorials
whose prerequisite concept is done and that are clearly non-security infrastructure how-tos. Excluded
`018` (IAM least-privilege — prerequisite `005` not yet produced + identity/security domain) and
`021/022` (depend on not-yet-produced auto-scaling/LB concepts).

---

## Per-candidate results

| ID | Topic | Decision | Final URL | Quality | Dedup | Cannibalization | Code Validation | Render | Review Status |
|---|---|---|---|--:|---|---|---|---|---|
| TCF-000016 | إطلاق أوّل خادم EC2 والاتّصال به | **CREATE** | `/learn/aws/07-launch-ec2` | 94 | PASS | None (net-new) | CLI syntax-verified, flagged for live run | ✅ | 👤 Human (MED: verify CLI live) |
| TCF-000017 | استضافة موقع ثابت على S3 | **CREATE** | `/learn/aws/08-static-website-s3` | 93 | PASS | None | JSON policy ✅ parses; CLI flagged | ✅ | 👤 Human (MED) |
| TCF-000019 | إعداد VPC بشبكات عامّة وخاصّة | **CREATE** | `/learn/aws/09-vpc-subnets` | 92 | PASS | None | CLI syntax-verified, flagged | ✅ | 👤 Human (MED) |
| TCF-000020 | نشر تطبيق Node.js على Lambda | **CREATE** | `/learn/aws/10-nodejs-lambda` | 93 | PASS | None | JS handler ✅ executes; CLI flagged; runtime `nodejs20.x` verify | ✅ | 👤 Human (MED-HIGH: runtime + IAM role) |
| TCF-000023 | إعداد MySQL على RDS | **CREATE** | `/learn/aws/11-mysql-rds` | 93 | PASS | None | CLI syntax-verified, flagged | ✅ | 👤 Human (MED: security guidance) |
| TCF-000025 | إعداد نطاق مخصّص عبر Route 53 | **CREATE** | `/learn/aws/12-route53-domain` | 92 | PASS | None | JSON change-batch ✅ parses; CLI flagged | ✅ | 👤 Human (MED) |

---

## Batch metrics

| Metric | Value |
|---|--:|
| Candidates attempted | 6 |
| CREATE / MERGE / UPDATE / REJECT | 6 / 0 / 0 / 0 |
| Average quality score | **92.8** |
| Lowest quality score | 92 (`019` VPC, `025` Route 53) |
| Render failures | 0 |
| Code-validation failures | 0 — executable parts validated (JS handler runs; 2 JSON blocks parse); AWS CLI commands syntax-verified and **flagged for live-environment execution** |
| Duplicate / cannibalization findings | 0 |
| Pages requiring human review | 6 (all) |
| Pages requiring security review | 0 (held pages excluded; security *notes* within tutorials — S3 public-access, RDS private subnet, IAM role — flagged for reviewer confirmation, not offensive content) |

**Version-sensitive claims flagged:** Lambda runtime `nodejs20.x` (verify latest supported); AWS CLI
command flags/behavior across services; S3 default block-public-access behavior. **All AWS CLI
commands must be run in a live AWS account to confirm** — they could not be executed here.

**Systemic quality problems:** none. Average 92.8, consistent with recent batches (drift watch
stable ~93). No STOP condition.

**Honesty note:** these tutorials deliberately teach *workflow + accurate representative commands*
rather than fragile step-by-step Console click-paths (which change often and cannot be verified
here), with an explicit "verify in a live account" banner on each page. This keeps them accurate and
non-stale per governance §8/§24.

---

## Corpus / production status after this batch

| | |
|---|--:|
| Total pages produced | **39** (27 Wave 1 + 12 Wave 2) |
| Wave 2 produced / total | 12 / 133 |
| Remaining Wave 1 | 3 — all security-held (`443/276/312`) |
| Remaining CREATE (whole backlog) | 451 |
| Dataset (immutable decisions) | 490 CREATE / 6 MERGE / 1 UPDATE (unchanged) |

---

## Integrity verification (this batch)

- No tracked files modified — additions only (6 MDX under `content/wave-1-drafts/aws/`, this report).
- `content/ar/tracks/` untouched → nothing auto-published.
- Immutable `docs/content-backlog/batch-001.json` untouched; decisions dataset unchanged (490/6/1).
- Security-held `443/276/312` not produced.
- 18/18 internal links resolve (existing tracks + same-track drafts); 0 invented URLs.
- Pipeline executed per page: page-existence → intent → dedup → cannibalization → cluster placement
  → scope → research/verify → Arabic draft → code validation (executable parts run; CLI flagged) →
  link validation → SEO metadata → quality ≥90 → real MDX compile → structure/link check → human
  review class → batch audit → checkpoint.

**Publication:** none. New tracks require `create-new-track` + CMS publish (human step).
