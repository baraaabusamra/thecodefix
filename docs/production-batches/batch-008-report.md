# Production Batch Report — 008

**Kubernetes track (part 3) · hands-on tutorials + troubleshooting** — 7 pages: the practical
deploy flow (Minikube → deploy → expose → rolling update) and the common-error trio.

**Date:** 2026-08-15 · **Cluster:** Kubernetes & Orchestration · **Pages:** 7 · **Status:**
production-ready, **unpublished** · **Security-held excluded:** `443/276/312`.

**Pre-production checks (all 7):** CREATE ✓ · prerequisites satisfied (core objects + workloads
done) ✓ · page-existence test ✓ (4 distinct tasks + 3 distinct error scenarios) · existing-content
overlap: none · cannibalization: none · standalone value ✓.

---

## Per-candidate results

| ID | Topic | Decision | Final URL | Quality | Dedup | Cannibalization | Code Validation | Render | Review Status |
|---|---|---|---|--:|---|---|---|---|---|
| TCF-000053 | إعداد عنقود محلّي بـ Minikube | **CREATE** | `/learn/kubernetes/14-minikube-setup` | 92 | PASS | None | kubectl syntax-verified (flag live) | ✅ | 👤 Human (MED) |
| TCF-000054 | نشر أوّل تطبيق | **CREATE** | `/learn/kubernetes/15-first-deploy` | 93 | PASS | None | YAML ✅ (kind: Deployment) + kubectl | ✅ | 👤 Human (MED) |
| TCF-000055 | كشف خدمة للإنترنت | **CREATE** | `/learn/kubernetes/16-expose-service` | 93 | PASS | None | YAML ✅ (kind: Service) + kubectl | ✅ | 👤 Human (MED) |
| TCF-000060 | تحديث دون توقّف (rolling update) | **CREATE** | `/learn/kubernetes/17-rolling-update` | 93 | PASS | None | kubectl (set image/rollout) syntax-verified | ✅ | 👤 Human (MED) |
| TCF-000063 | تشخيص CrashLoopBackOff | **CREATE** | `/learn/kubernetes/18-crashloopbackoff` | 94 | PASS | None | kubectl (logs --previous) syntax-verified | ✅ | 👤 Human (MED) |
| TCF-000064 | إصلاح ImagePullBackOff | **CREATE** | `/learn/kubernetes/19-imagepullbackoff` | 94 | PASS | None | kubectl (describe) syntax-verified | ✅ | 👤 Human (MED) |
| TCF-000065 | خدمة غير قابلة للوصول | **CREATE** | `/learn/kubernetes/20-service-unreachable` | 94 | PASS | None | kubectl (get endpoints) syntax-verified | ✅ | 👤 Human (MED) |

---

## Batch metrics

| Metric | Value |
|---|--:|
| Candidates attempted | 7 |
| CREATE / MERGE / UPDATE / REJECT | 7 / 0 / 0 / 0 |
| Average quality score | **93.3** |
| Lowest quality score | 92 (`053` Minikube setup) |
| Render failures | 0 |
| Code-validation failures | 0 — 2/2 YAML manifests valid `kind`; **kubectl commands syntax-verified, flagged for live cluster** (could not run against a real cluster here) |
| Duplicate / cannibalization findings | 0 |
| Pages requiring human review | 7 (all) |
| Pages requiring security review | 0 |

**Version-sensitive claims flagged:** kubectl subcommands/flags; image tags (`nginx:1.27/1.28`);
Minikube workflow. Reviewer confirms against the target kubectl/cluster version and runs the commands
on a live cluster.

**Systemic quality problems:** none. Average 93.3 (recent: 92.8 / 93.3 / **93.3**). Troubleshooting
pages score well (accurate diagnostic methodology; high-value error-query intent). No STOP condition.

---

## Kubernetes track status

| | |
|---|--:|
| K8s lessons produced | **21** (2 pillars · 6 core objects · 6 workloads/scaling · 4 tutorials · 3 troubleshooting) |
| `create-new-track` lesson bar (15–18) | ✅ exceeded |
| Remaining for a *complete* track | K8s **Secrets/RBAC** sub-cluster (`043/057/068/069`, security-gated) · Helm (`070`) · autoscaling/ingress tutorials (`058/059`) · kubectl cheat-sheet + YAML reference (`061/062`) · comparisons (`067`) · summary lesson |

---

## Corpus / production status after this batch

| | |
|---|--:|
| Total pages produced | **78** (all render-valid, unpublished) |
| Kubernetes track | 21 lessons |
| AWS track | 33 lessons (content-complete + build-verified) |
| Remaining Wave 1 | 3 — all security-held (`443/276/312`) |
| Remaining eligible CREATE (whole backlog) | 412 |
| Dataset (immutable decisions) | 490 CREATE / 6 MERGE / 1 UPDATE (unchanged) |

---

## Integrity verification (this batch)

- No tracked files modified — additions only (7 MDX under `content/wave-1-drafts/kubernetes/`, this report).
- `src/content/tracks/` untouched → nothing published/pushed/deployed (HEAD still `ebb2d10`).
- Immutable `docs/content-backlog/batch-001.json` untouched; decisions unchanged (490/6/1).
- Security-held `443/276/312` not produced.
- All internal links validated (strict cross-track rule); 0 invented URLs.
- No PR opened, nothing pushed, nothing deployed.
