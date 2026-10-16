# Production Batch Report — 005

**AWS track completion (part 2) · reference, troubleshooting & comparisons** — 8 pages rounding out
the AWS track's supporting layers.

**Date:** 2026-08-14 · **Cluster:** AWS Cloud Foundations · **Pages:** 8 · **Status:**
production-ready, **unpublished** · **Security-held excluded:** `443/276/312`.

**Pre-production checks (all 8):** CREATE ✓ · prerequisites satisfied ✓ · page-existence test ✓
(3 distinct error scenarios, 3 distinct comparisons, a CLI cheat-sheet, a naming reference) ·
existing-content overlap: none · cannibalization: none · standalone value ✓.

---

## Per-candidate results

| ID | Topic | Decision | Final URL | Quality | Dedup | Cannibalization | Code Validation | Render | Review Status |
|---|---|---|---|--:|---|---|---|---|---|
| TCF-000026 | ورقة أوامر AWS CLI | **CREATE** | `/learn/aws/20-cli-cheatsheet` | 93 | PASS | None | AWS CLI commands syntax-verified, flagged for live run | ✅ | 👤 Human (MED) |
| TCF-000027 | مرجع تسمية خدمات AWS | **CREATE** | `/learn/aws/21-service-naming` | 93 | PASS | None | N/A (acronym reference) | ✅ | 👤 Human (LOW-MED) |
| TCF-000028 | تشخيص تعذّر SSH إلى EC2 | **CREATE** | `/learn/aws/22-troubleshoot-ssh` | 92 | PASS | None | N/A | ✅ | 👤 Human (MED) |
| TCF-000029 | تصحيح "Access Denied" في S3 | **CREATE** | `/learn/aws/23-debug-s3-access` | 92 | PASS | None | N/A | ✅ | 👤 Human (MED) |
| TCF-000030 | إصلاح "InvalidClientTokenId" | **CREATE** | `/learn/aws/24-fix-invalid-token` | 91 | PASS | None | CLI (`aws sts`, `aws configure`) syntax-verified | ✅ | 👤 Human (MED) |
| TCF-000031 | AWS مقابل Azure مقابل GCP | **CREATE** | `/learn/aws/25-aws-azure-gcp` | 91 | PASS | None | N/A | ✅ | 👤 Human (**verify market/feature claims**) |
| TCF-000032 | EC2 مقابل Lambda | **CREATE** | `/learn/aws/26-ec2-vs-lambda` | 93 | PASS | None | N/A | ✅ | 👤 Human (MED) |
| TCF-000033 | S3 مقابل EBS مقابل EFS | **CREATE** | `/learn/aws/27-s3-ebs-efs` | 95 | PASS | None | N/A | ✅ | 👤 Human (MED) |

---

## Batch metrics

| Metric | Value |
|---|--:|
| Candidates attempted | 8 |
| CREATE / MERGE / UPDATE / REJECT | 8 / 0 / 0 / 0 |
| Average quality score | **92.5** |
| Lowest quality score | 91 (`030`, `031`) |
| Render failures | 0 |
| Code-validation failures | 0 (AWS CLI commands in `026`/`030` syntax-verified, flagged for live run; other pages have no code) |
| Duplicate / cannibalization findings | 0 |
| Pages requiring human review | 8 (all) |
| Pages requiring security review | 0 held; `029`/`030` are troubleshooting guidance touching permissions/credentials (MED, not offensive) |

**Version-sensitive claims flagged:** provider market-position/feature notes in `031` (page carries an
explicit "verify against current sources" note); AWS CLI command behavior in `026`/`030`; error-cause
lists reflect current AWS defaults (e.g. S3 block-public-access on by default).

**Systemic quality problems:** none. Average 92.5; drift watch stable (recent: 92.8 / 92.7 / 92.3 /
92.5). No STOP condition.

---

## AWS track status (toward complete-track threshold)

| | |
|---|--:|
| AWS lessons produced | **28** (pillar · 12 concepts/comparisons · 6 tutorials · Well-Architected · 2 reference · 3 troubleshooting · 3 more comparisons) |
| `create-new-track` lesson bar (15–18) | ✅ exceeded |
| **AWS non-security content** | **essentially complete** (compute, storage, networking, DB, serverless, CDN, IaC, queues, best-practices, hands-on tutorials, troubleshooting, comparisons, CLI/naming reference) |
| Still required to *fully* complete the track | (1) **IAM sub-cluster** `005/018/034/036` — **security-review-gated**; (2) a closing **summary lesson**; (3) a `content/ar/reference/aws.json` **reference section** (per create-new-track §3) |

**`create-new-track` still NOT triggered.** Remaining before it can run: IAM (security-gated) +
summary lesson + reference section — and, per your instruction, **all AWS pages await human review**
(the CLI tutorials contain commands not yet executed against a live AWS account). Next batch: the
IAM security sub-cluster, produced **staged and clearly flagged for security review**, plus the
summary lesson + reference section.

---

## Corpus / production status after this batch

| | |
|---|--:|
| Total pages produced | **60** (all render-valid, unpublished) |
| AWS track | 28 lessons |
| Remaining Wave 1 | 3 — all security-held (`443/276/312`) |
| Remaining eligible CREATE (whole backlog) | 430 |
| Dataset (immutable decisions) | 490 CREATE / 6 MERGE / 1 UPDATE (unchanged) |

---

## Integrity verification (this batch)

- No tracked files modified — additions only (8 MDX under `content/wave-1-drafts/aws/`, this report).
- `content/ar/tracks/` untouched → nothing published/pushed/deployed (HEAD still `ebb2d10`).
- Immutable `docs/content-backlog/batch-001.json` untouched; decisions unchanged (490/6/1).
- Security-held `443/276/312` not produced.
- 15/15 internal links resolve (same-track drafts); 0 invented URLs.
- No PR opened, nothing pushed, nothing deployed.
