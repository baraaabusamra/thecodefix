# Production Batch Report — 003

**Wave 2 · Kubernetes core-objects cluster** — 6 concept pages covering the fundamental K8s objects,
sequenced pedagogically (Pod → ReplicaSet → Deployment → Service → Namespace → Ingress). Third report
under `docs/production-batches/`.

**Date:** 2026-08-14 · **Wave:** 2 · **Cluster:** Kubernetes & Orchestration · **Pages:** 6 ·
**Status:** production-ready, **unpublished** · **Security-held excluded:** `443/276/312`.

**Selection rationale:** highest-priority cluster with satisfied prerequisites — the K8s pillars
`037` (What Is Kubernetes) and `038` (Architecture) were produced in Wave 1. Chose the six core-object
concepts, all non-security. Deferred `043` (ConfigMaps & **Secrets** — secrets handling → security
review) and `045/047/049–052` (advanced objects) for later batches.

**Pre-production checks (all 6):** CREATE status ✓ · prerequisites satisfied (`037`/`038` done) ✓ ·
page-existence test ✓ (each a distinct core object) · existing-content overlap: none (K8s track is
net-new; `devops/22` is a shallow intro these pages build beyond) · semantic cannibalization: none ·
standalone value ✓.

---

## Per-candidate results

| ID | Topic | Decision | Final URL | Quality | Dedup | Cannibalization | Code Validation | Render | Review Status |
|---|---|---|---|--:|---|---|---|---|---|
| TCF-000039 | ما هو الـ Pod؟ | **CREATE** | `/learn/kubernetes/02-pods` | 93 | PASS | None (net-new) | YAML manifest ✅ parses (kind: Pod) | ✅ | 👤 Human (MED: API version) |
| TCF-000044 | ما هو الـ ReplicaSet؟ | **CREATE** | `/learn/kubernetes/03-replicaset` | 92 | PASS | None | YAML ✅ (kind: ReplicaSet, apps/v1) | ✅ | 👤 Human (MED) |
| TCF-000040 | ما هو الـ Deployment؟ | **CREATE** | `/learn/kubernetes/04-deployments` | 93 | PASS | None | YAML ✅ (kind: Deployment) | ✅ | 👤 Human (MED) |
| TCF-000041 | خدمات Kubernetes (ClusterIP/NodePort/LoadBalancer) | **CREATE** | `/learn/kubernetes/05-services` | 93 | PASS | None | YAML ✅ (kind: Service) | ✅ | 👤 Human (MED) |
| TCF-000042 | ما هو الـ Namespace؟ | **CREATE** | `/learn/kubernetes/06-namespaces` | 91 | PASS | None | YAML ✅ (kind: Namespace) | ✅ | 👤 Human (LOW-MED) |
| TCF-000046 | ما هو الـ Ingress؟ | **CREATE** | `/learn/kubernetes/07-ingress` | 94 | PASS | None | YAML ✅ (kind: Ingress, networking.k8s.io/v1) | ✅ | 👤 Human (MED) |

---

## Batch metrics

| Metric | Value |
|---|--:|
| Candidates attempted | 6 |
| CREATE / MERGE / UPDATE / REJECT | 6 / 0 / 0 / 0 |
| Average quality score | **92.7** |
| Lowest quality score | 91 (`042` Namespace) |
| Render failures | 0 |
| Code-validation failures | 0 — **6/6 YAML manifests parse with a valid `kind`** (validated via the `yaml` library the site depends on) |
| Duplicate / cannibalization findings | 0 |
| Pages requiring human review | 6 (all) |
| Pages requiring security review | 0 (Namespace covers the "logical-not-hard-security-boundary" nuance correctly; not offensive content) |

**Version-sensitive claims flagged:** K8s API versions (`v1`, `apps/v1`, `networking.k8s.io/v1` — all
current and correct as written) and the `nginx:1.27` image tag. Reviewer should confirm against the
target cluster's K8s version.

**Systemic quality problems:** none. Average 92.7; drift watch **stable** (recent batches:
93.0 / 92.4 / 93.2 / 92.8 / 92.7). No STOP condition. The `042` = 91 is the batch low (concise
single-object page) but clears the gate.

---

## Corpus / production status after this batch

| | |
|---|--:|
| Total pages produced | **45** (27 Wave 1 + 18 Wave 2) |
| Wave 2 produced / total | 18 / 133 |
| Remaining Wave 1 | 3 — all security-held (`443/276/312`) |
| Remaining eligible CREATE (whole backlog) | 445 |
| Dataset (immutable decisions) | 490 CREATE / 6 MERGE / 1 UPDATE (unchanged) |

**Kubernetes cluster progress:** pillars (2) + core objects (6) = 8 pages; remaining K8s Wave-2
concepts/tutorials continue in later batches.

---

## Integrity verification (this batch)

- No tracked files modified — additions only (6 MDX under `content/wave-1-drafts/kubernetes/`, this report).
- `src/content/tracks/` untouched → nothing auto-published.
- Immutable `docs/content-backlog/batch-001.json` untouched; decisions dataset unchanged (490/6/1).
- Security-held `443/276/312` not produced.
- 8/8 internal links resolve (existing tracks + same-track drafts); 0 invented URLs.
- Pipeline executed per page: page-existence → intent → dedup → cannibalization → cluster placement
  → scope → research/verify → Arabic draft → **YAML code validation (6/6 parse)** → link validation →
  SEO metadata → quality ≥90 → real MDX compile → structure/link check → human-review class → batch
  audit → checkpoint.

**Publication:** none. New tracks require `create-new-track` + CMS publish (human step).
