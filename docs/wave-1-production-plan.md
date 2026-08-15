# Wave 1 — Production Plan (30 Foundation Pillars)

**Status:** architecture blueprint for the first production sprint. **No article bodies are written
here** — this is the final structural review before writing begins.
**Source of truth:** [`content/data/content-backlog.json`](../content/data/content-backlog.json)
(Wave 1 = 30 CREATE pillars). Governed by [`docs/content-guidelines.md`](content-guidelines.md).
**Prior gates:** [`docs/content-roadmap.md`](content-roadmap.md) ·
[`docs/pre-production-audit.md`](pre-production-audit.md) ·
[`docs/final-watchlist-audit.md`](final-watchlist-audit.md).

Each pillar anchors one of the 21 new clusters; downstream Waves 2–7 depend on these existing. All
30 will live as the intro/anchor lessons (`00`/`01`) of **new tracks** — which must each go through
the site's `create-new-track` process before scaffolding (per the backlog README). URLs follow the
live pattern `/learn/[tech]/[lesson]`.

---

## 1. Review-requirement summary

**Human review: required for all 30** (pillar pages, §22). Specialized gates below.

| Gate | Count | Pillars |
|---|--:|---|
| 🔒 Security review | 3 | 443, 276, 312 |
| 🔁 Technical/version verification | 18 | 097, 072, 001, 037, 038, 073, 443, 098, 162, 163, 183, 182, 138, 424, 341, 342, 361, 362 |
| `</>` Code validation | 14 | 398, 037, 038, 073, 443, 162, 163, 183, 138, 341, 342, 262, 361, 362 |
| 👤 Human review | 30 | ALL |

---

## 2. Master table (production order)

| # | ID | Topic | Type | Audience | Intent | Cluster | Proposed URL | 🔒 | 🔁 | `</>` |
|--:|---|---|---|---|---|---|---|:--:|:--:|:--:|
| 1 | 097 | What Is Machine Learning? | Concept | مبتدئون (جدد على المجال) | Educational | AI, ML & LLMs | `/learn/ai-ml/00-intro` | — | ✅ | — |
| 2 | 398 | What Is Unit Testing and Why Does It Matter? | Concept | مبتدئون (جدد على المجال) | Educational | Testing & Eng Practice | `/learn/software-testing/00-intro` | — | — | ✅ |
| 3 | 072 | What Is Infrastructure as Code and Why Does It Matter? | Concept | مبتدئون (جدد على المجال) | Educational | Terraform / IaC | `/learn/terraform/00-intro` | — | ✅ | — |
| 4 | 001 | What Is Cloud Computing and How Does It Differ from On-Premises Infrastructure? | Concept | مبتدئون (جدد على المجال) | Educational | AWS Cloud Foundations | `/learn/aws/00-intro` | — | ✅ | — |
| 5 | 037 | What Is Kubernetes and Why Do We Need Container Orchestration? | Concept | مبتدئون (جدد على المجال) | Educational | Kubernetes & Orchestration | `/learn/kubernetes/00-intro` | — | ✅ | ✅ |
| 6 | 038 | Understanding Kubernetes Architecture: Control Plane and Nodes | Concept | مبتدئون (جدد على المجال) | Educational | Kubernetes & Orchestration | `/learn/kubernetes/01-architecture` | — | ✅ | ✅ |
| 7 | 073 | What Is Terraform and How Does It Work? | Concept | مبتدئون (جدد على المجال) | Educational | Terraform / IaC | `/learn/terraform/01-what-is-terraform` | — | ✅ | ✅ |
| 8 | 207 | What Is System Design and Why Does It Matter for Engineers? | Concept | مبتدئون (جدد على المجال) | Educational | System Design | `/learn/system-design/00-intro` | — | — | — |
| 9 | 443 | What Is OAuth 2.0 and How Does It Work? | Concept | مبتدئ–متوسّط | Educational | Auth & Identity | `/learn/authentication/01-oauth2` | ✅ | ✅ | ✅ |
| 10 | 276 | What Is a Security Operations Center (SOC)? | Concept | مبتدئون (جدد على المجال) | Educational | SOC & Blue Team | `/learn/soc/00-intro` | ✅ | — | — |
| 11 | 312 | Understanding the Phases of a Penetration Test | Concept | مبتدئون (جدد على المجال) | Educational | Offensive Security / Pentest | `/learn/pentesting/00-intro` | ✅ | — | — |
| 12 | 399 | Understanding the Testing Pyramid: Unit, Integration, and E2E | Concept | مبتدئون (جدد على المجال) | Educational | Testing & Eng Practice | `/learn/software-testing/01-testing-pyramid` | — | — | — |
| 13 | 098 | What Is Deep Learning and How Does It Differ from Machine Learning? | Concept | مبتدئون (جدد على المجال) | Educational | AI, ML & LLMs | `/learn/ai-ml/01-deep-learning` | — | ✅ | — |
| 14 | 162 | What Is Redis and How Does In-Memory Caching Work? | Concept | مبتدئون (جدد على المجال) | Educational | Redis & Caching | `/learn/redis/00-intro` | — | ✅ | ✅ |
| 15 | 163 | Understanding Redis Data Types: Strings, Lists, Sets, and Hashes | Concept | مبتدئون (جدد على المجال) | Educational | Redis & Caching | `/learn/redis/01-data-types` | — | ✅ | ✅ |
| 16 | 183 | What Are PostgreSQL Schemas and How Do They Organize Data? | Concept | مبتدئون (جدد على المجال) | Educational | PostgreSQL Administration | `/learn/postgresql/01-schemas` | — | ✅ | ✅ |
| 17 | 182 | Understanding PostgreSQL's MVCC (Multi-Version Concurrency Control) | Concept | متوسّط–متقدّم | Educational | PostgreSQL Administration | `/learn/postgresql/02-mvcc` | — | ✅ | — |
| 18 | 138 | Understanding PowerShell Cmdlets | Concept | مبتدئون (جدد على المجال) | Educational | PowerShell Scripting | `/learn/powershell/00-cmdlets` | — | ✅ | ✅ |
| 19 | 488 | What Is Entity-Relationship (ER) Modeling? | Concept | مبتدئون (جدد على المجال) | Educational | Data Modeling & DB Design | `/learn/database-design/00-intro` | — | — | — |
| 20 | 423 | What Is Web Performance and Why Does It Matter for Users and SEO? | Concept | مبتدئون (جدد على المجال) | Educational | Web Performance & a11y | `/learn/web-performance/00-intro` | — | — | — |
| 21 | 424 | Understanding Core Web Vitals: LCP, INP, and CLS | Concept | مبتدئ–متوسّط | Educational | Web Performance & a11y | `/learn/web-performance/01-core-web-vitals` | — | ✅ | — |
| 22 | 376 | How Do Technical Interviews at Tech Companies Actually Work? | Concept | مبتدئون (جدد على المجال) | Educational | Interview & Career | `/learn/interview-prep/00-intro` | — | — | — |
| 23 | 238 | Understanding CPU Scheduling Algorithms | Concept | مبتدئ–متوسّط | Educational | OS & Computer Architecture | `/learn/operating-systems/01-cpu-scheduling` | — | — | — |
| 24 | 341 | What Is Ruby and What Is It Used For? | Concept | مبتدئون (جدد على المجال) | Educational | Ruby | `/learn/ruby/00-intro` | — | ✅ | ✅ |
| 25 | 342 | Understanding Ruby's Object-Oriented Nature | Concept | مبتدئون (جدد على المجال) | Educational | Ruby | `/learn/ruby/01-oop-nature` | — | ✅ | ✅ |
| 26 | 261 | What Is a Compiler and How Does It Work? | Concept | مبتدئ–متوسّط | Educational | Compilers & Language Theory | `/learn/compilers/00-intro` | — | — | — |
| 27 | 262 | Understanding Lexical Analysis (Tokenization) | Concept | مبتدئ–متوسّط | Educational | Compilers & Language Theory | `/learn/compilers/01-lexical-analysis` | — | — | ✅ |
| 28 | 361 | What Is Dart and Why Does Flutter Use It? | Concept | مبتدئون (جدد على المجال) | Educational | Dart | `/learn/dart/00-intro` | — | ✅ | ✅ |
| 29 | 362 | Understanding Dart's Null Safety | Concept | مبتدئ–متوسّط | Educational | Dart | `/learn/dart/01-null-safety` | — | ✅ | ✅ |
| 30 | 464 | What Is the Mobile App Lifecycle? | Concept | مبتدئون (جدد على المجال) | Educational | Mobile Platforms | `/learn/mobile/00-app-lifecycle` | — | — | — |

---

## 3. Shared production standards (apply to every pillar)

**Content structure baseline (§12–§13, beginner-first):** simple explanation → technical
explanation → example → practical application → common mistakes → "what to learn next." Arabic-first
per §14; English technical terms kept where conventional and defined once.

**Quality bar (§21):** each pillar must score **≥ 90/100** before publish (pillars are held to the
highest bar). Non-negotiables: factual accuracy (§10), validated code (§11), original structure
(§9), correct internal links (§17), matched search intent (§16).

**Verification protocol (§10–§11):** verify every version-sensitive claim against the vendor docs in
`node_modules/next/dist/docs/` (for Next-adjacent topics) or official sources; run every code/command/
config example; never invent APIs, flags, CVEs, or benchmarks.

**Metadata (§23):** set created/last-verified dates, technology + version, next-review date, status.

---

## 4. Per-pillar detail

### 1. TCF-000097 — What Is Machine Learning?

- **Cluster / parent:** AI, ML & LLMs · parent topic: What Is Machine Learning?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/ai-ml/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** What Is Deep Learning and How Does It Differ from Machine Learning?; What Is a Neural Network?; Understanding Supervised vs Unsupervised Learning; What Is Overfitting in Machine Learning?; What Is a Large Language Model (LLM)?; How Do Transformers Work? The Attention Mechanism Explained
- **Related topics:** What Is Deep Learning and How Does It Differ from Machine Learning?; What Is a Neural Network?; Understanding Supervised vs Unsupervised Learning
- **Recommended structure:** 
    - ما هو تعلّم الآلة (تعريف مبسّط: أنظمة تتعلّم من البيانات لا من قواعد مكتوبة)
    - لماذا يهم / أين يُستخدم (أمثلة واقعية)
    - الأنواع: مُوجَّه / غير مُوجَّه / تعزيزي (نظرة سريعة تربط بـ 100)
    - كيف يتعلّم النموذج (بيانات → تدريب → تنبؤ) بلا رياضيات ثقيلة
    - ML مقابل البرمجة التقليدية
    - ماذا تتعلّم بعدها → 098, 099
- **Technical verification:** 
    - مصطلحات 2026 دقيقة (supervised/unsupervised/RL)
    - لا مبالغة في ادعاءات القدرات; لا إحصاءات مُختلقة
- **Internal linking targets:** 098 Deep Learning; 099 Neural Network; 100 Supervised vs Unsupervised; 126 AI vs ML vs DL
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 2. TCF-000398 — What Is Unit Testing and Why Does It Matter?

- **Cluster / parent:** Testing & Eng Practice · parent topic: What Is Unit Testing?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/software-testing/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** Understanding the Testing Pyramid: Unit, Integration, and E2E; What Is Test-Driven Development (TDD)?; Understanding Mocking and Stubbing in Tests; What Is Code Coverage and Does It Actually Matter?; Understanding Integration Testing; What Is End-to-End (E2E) Testing?
- **Related topics:** Understanding the Testing Pyramid: Unit, Integration, and E2E; What Is Test-Driven Development (TDD)?; Understanding Mocking and Stubbing in Tests
- **Recommended structure:** 
    - ما هو اختبار الوحدة ولماذا (تعريف + قيمة عملية)
    - تشريح اختبار: arrange/act/assert
    - مثال بسيط قابل للتشغيل (لغة محايدة أو JS)
    - ما الذي يستحق اختبار وحدة وما لا
    - أخطاء المبتدئين
    - ماذا بعد → 399 هرم الاختبار, 400 TDD
- **Technical verification:** 
    - الكود مترجم/يعمل فعليًّا
    - إطار الاختبار المذكور حديث (Jest/PyTest إصدار 2026)
- **Internal linking targets:** 399 Testing Pyramid; 400 TDD; 407 Write Your First Unit Test; react/23-testing (cross-link)
- **Review gates:** </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 3. TCF-000072 — What Is Infrastructure as Code and Why Does It Matter?

- **Cluster / parent:** Terraform / IaC · parent topic: What Is Infrastructure as Code?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/terraform/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** What Is Terraform and How Does It Work?; Understanding Terraform State Files; What Is a Terraform Provider?; Understanding Terraform Modules; What Do Terraform Plan and Apply Actually Do?; How to Install Terraform and Write Your First Configuration
- **Related topics:** What Is Terraform and How Does It Work?; Understanding Terraform State Files; What Is a Terraform Provider?
- **Recommended structure:** 
    - ما هي البنية ككود (مشكلة الإعداد اليدوي → الحل)
    - تصريحي مقابل أمري
    - idempotency وحالة البنية (تمهيد لـ 074)
    - أدوات النظام البيئي (Terraform/OpenTofu/CloudFormation)
    - لماذا يهم للفرق
    - ماذا بعد → 073 Terraform
- **Technical verification:** 
    - يجب أن يتقاطع مع devops/12-iac بلا تكرار (canonical هنا)
    - تحديث devops/12 للربط
    - مصطلحات محدّثة (OpenTofu موجود)
- **Internal linking targets:** 073 What Is Terraform; 013 CloudFormation; 087 Terraform vs Ansible; devops/12-iac (UPDATE cross-link)
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; **guardrail:** Overlaps devops/12-iac. Keep as canonical IaC concept for the Terraform cluster; narrow/cross-link devops/12.

### 4. TCF-000001 — What Is Cloud Computing and How Does It Differ from On-Premises Infrastructure?

- **Cluster / parent:** AWS Cloud Foundations · parent topic: What Is Cloud Computing?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/aws/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** IaaS vs PaaS vs SaaS: Choosing the Right Cloud Model; What Is Amazon EC2 and How Do Virtual Machines Work in AWS?; What Is Amazon S3 and How Does Object Storage Work?
- **Recommended structure:** 
    - ما هي الحوسبة السحابية (تعريف مبسّط)
    - سحابي مقابل on-premises (جدول مقارنة)
    - نماذج الخدمة IaaS/PaaS/SaaS (تمهيد لـ 002)
    - لماذا الشركات تهاجر للسحابة
    - المزودون الكبار (AWS/Azure/GCP)
    - ماذا بعد → 003 EC2, 005 IAM
- **Technical verification:** 
    - أسماء/خدمات AWS دقيقة 2026
    - لا أسعار مُختلقة
- **Internal linking targets:** 002 IaaS/PaaS/SaaS; 003 EC2; 005 IAM; 031 AWS vs Azure vs GCP; networking/21-cloud-networking
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 5. TCF-000037 — What Is Kubernetes and Why Do We Need Container Orchestration?

- **Cluster / parent:** Kubernetes & Orchestration · parent topic: What Is Kubernetes?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/kubernetes/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Kubernetes Architecture: Control Plane and Nodes; What Is a Pod in Kubernetes?; What Is a Kubernetes Deployment and How Does It Manage Pods?
- **Recommended structure:** 
    - مشكلة تشغيل الحاويات على نطاق واسع
    - ما هو Kubernetes وما يحلّه (orchestration)
    - مفاهيم عليا: cluster/node/pod (تمهيد)
    - متى تحتاجه ومتى لا (لا تفرط في الهندسة)
    - علاقته بـ Docker
    - ماذا بعد → 038 المعمارية
- **Technical verification:** 
    - canonical مقابل devops/22-kubernetes-intro — حدّث devops/22 للربط
    - إصدار K8s API حديث (1.3x 2026)
- **Internal linking targets:** 038 Architecture; 039 Pods; 066 K8s vs Swarm (MERGED→docker/26); devops/22-kubernetes-intro (UPDATE); docker/26-swarm-vs-k8s
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; **guardrail:** Overlaps devops/22-kubernetes-intro (shallow). Keep as canonical K8s pillar; update devops/22 to cross-link.

### 6. TCF-000038 — Understanding Kubernetes Architecture: Control Plane and Nodes

- **Cluster / parent:** Kubernetes & Orchestration · parent topic: What Is Kubernetes?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/kubernetes/01-architecture`
- **Prerequisites:** What Is Kubernetes?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Kubernetes and Why Do We Need Container Orchestration?; What Is a Pod in Kubernetes?; What Is a Kubernetes Deployment and How Does It Manage Pods?
- **Recommended structure:** 
    - مستوى التحكّم (API server, etcd, scheduler, controller-manager)
    - عُقد العمل (kubelet, kube-proxy, container runtime)
    - كيف تتدفّق طلبات النشر عبر المكوّنات
    - مخطّط معماري
    - أخطاء فهم شائعة
    - ماذا بعد → 039 Pods, 040 Deployments
- **Technical verification:** 
    - أسماء المكوّنات دقيقة (containerd runtime، dockershim محذوف)
    - مخطّط صحيح تقنيًّا
- **Internal linking targets:** 037 What Is Kubernetes; 039 Pods; 069 RBAC; 061 kubectl Cheat Sheet
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 7. TCF-000073 — What Is Terraform and How Does It Work?

- **Cluster / parent:** Terraform / IaC · parent topic: What Is Infrastructure as Code?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/terraform/01-what-is-terraform`
- **Prerequisites:** What Is Infrastructure as Code?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Infrastructure as Code and Why Does It Matter?; Understanding Terraform State Files; What Is a Terraform Provider?
- **Recommended structure:** 
    - ما هو Terraform (محرّك IaC، HCL، providers)
    - دورة العمل write→plan→apply
    - مثال HCL بسيط (provider + resource)
    - الحالة (state) لماذا توجد
    - Terraform مقابل بدائل
    - ماذا بعد → 074 State, 076 Modules
- **Technical verification:** 
    - HCL يُنفَّذ فعليًّا (terraform validate)
    - إصدار Terraform/OpenTofu حديث
    - provider AWS محدّث
- **Internal linking targets:** 072 What Is IaC; 074 State Files; 078 First Config; 083 Terraform CLI Cheat Sheet
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 8. TCF-000207 — What Is System Design and Why Does It Matter for Engineers?

- **Cluster / parent:** System Design · parent topic: What Is System Design?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/system-design/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Horizontal vs Vertical Scaling; What Is Load Balancing and How Does It Work?; Understanding the CAP Theorem
- **Recommended structure:** 
    - ما هو تصميم الأنظمة ولماذا يهم للمهندسين
    - المتطلبات الوظيفية/غير الوظيفية
    - المفاضلات الأساسية (scalability/reliability/cost)
    - خريطة الموضوعات القادمة (scaling/LB/caching/CAP)
    - إطار مقابلة تصميم الأنظمة (نظرة)
    - ماذا بعد → 208 Scaling, 209 Load Balancing
- **Technical verification:** 
    - مفاهيم دقيقة; اربط microservices track بلا تكرار
- **Internal linking targets:** 208 Horizontal vs Vertical Scaling; 209 Load Balancing; 210 CAP; microservices track (cross-link)
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 9. TCF-000443 — What Is OAuth 2.0 and How Does It Work?

- **Cluster / parent:** Auth & Identity · parent topic: What Is OAuth 2.0?
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/authentication/01-oauth2`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding OpenID Connect vs OAuth; What Is Single Sign-On (SSO)?; Understanding Session-Based vs Token-Based Authentication
- **Recommended structure:** 
    - مشكلة التفويض المُفوَّض (لماذا لا نشارك كلمات المرور)
    - أدوار OAuth 2.0 (resource owner/client/auth server/resource server)
    - تدفّق Authorization Code + PKCE (المخطّط)
    - access/refresh tokens, scopes
    - أخطاء أمنية شائعة (تمهيد لـ 457)
    - ماذا بعد → 444 OIDC, 450 Google login
- **Technical verification:** 
    - مطابق RFC 6749 + أفضل ممارسات 2026 (PKCE إلزامي، implicit flow مهجور)
    - تمييز عن cybersecurity/26-jwt-security & api-security/02
- **Internal linking targets:** 444 OIDC vs OAuth; 446 Session vs Token; 450 OAuth Google; 456 Grant Types Reference; api-security/02-authentication
- **Review gates:** 🔒 Security · 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 10. TCF-000276 — What Is a Security Operations Center (SOC)?

- **Cluster / parent:** SOC & Blue Team · parent topic: What Is a SOC?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/soc/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Blue Team vs Red Team; What Is a SIEM and How Does It Work?; Understanding the Incident Response Lifecycle
- **Recommended structure:** 
    - ما هو مركز عمليات الأمن (SOC) ودوره
    - الأشخاص/العمليات/التقنيات (SIEM/EDR/SOAR)
    - مستويات محلّلي SOC (T1/T2/T3)
    - دورة الحياة: رصد→تحليل→استجابة
    - SOC مقابل الفريق الأحمر
    - ماذا بعد → 278 SIEM, 279 IR Lifecycle
- **Technical verification:** 
    - مراجعة أمنية بشرية إلزامية (§22)
    - أدوات/أطر دقيقة (MITRE ATT&CK حالي)
    - لا تعليمات هجومية
- **Internal linking targets:** 277 Blue vs Red Team; 278 SIEM; 305 SIEM vs EDR; cybersecurity/16-incident-response (cross-link)
- **Review gates:** 🔒 Security · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 11. TCF-000312 — Understanding the Phases of a Penetration Test

- **Cluster / parent:** Offensive Security / Pentest · parent topic: What Is Penetration Testing?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/pentesting/00-intro`
- **Prerequisites:** What Is Penetration Testing?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Penetration Testing and How Does It Differ from a Vulnerability Scan?; What Is Reconnaissance in Ethical Hacking?; Understanding OSINT (Open-Source Intelligence)
- **Recommended structure:** 
    - مراحل اختبار الاختراق (recon→scanning→exploitation→post-exploitation→reporting)
    - النطاق والتفويض القانوني (تأكيد مبكّر)
    - الفرق عن فحص الثغرات
    - منهجيات (PTES/OWASP WSTG نظرة)
    - الحدود الأخلاقية (رابط لـ 339)
    - ماذا بعد → 313 Recon, 324 Lab Setup
- **Technical verification:** 
    - مراجعة أمنية بشرية إلزامية (§22)
    - تأطير دفاعي/تعليمي; تأكيد التفويض القانوني؛ لا استهداف أنظمة حيّة
    - تمييز عن api-security/16-penetration-testing
- **Internal linking targets:** 311 Pentest vs Vuln Scan; 324 Pentest Lab (Legally); 339 Legal & Ethical Boundaries; api-security/16-penetration-testing
- **Review gates:** 🔒 Security · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 12. TCF-000399 — Understanding the Testing Pyramid: Unit, Integration, and E2E

- **Cluster / parent:** Testing & Eng Practice · parent topic: What Is Unit Testing?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/software-testing/01-testing-pyramid`
- **Prerequisites:** What Is Unit Testing?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Unit Testing and Why Does It Matter?; What Is Test-Driven Development (TDD)?; Understanding Mocking and Stubbing in Tests
- **Recommended structure:** 
    - ما هو هرم الاختبار (unit/integration/E2E)
    - لماذا القاعدة عريضة (سرعة/تكلفة/ثقة)
    - مضادّ النمط: مخروط الآيس كريم
    - توزيع عملي للاختبارات
    - ربط بكل طبقة (403 integration, 404 E2E)
    - ماذا بعد → 400 TDD
- **Technical verification:** 
    - نسب/توصيات متوازنة لا مطلقة
- **Internal linking targets:** 398 What Is Unit Testing; 403 Integration Testing; 404 E2E Testing; 417 Unit vs Integration
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 13. TCF-000098 — What Is Deep Learning and How Does It Differ from Machine Learning?

- **Cluster / parent:** AI, ML & LLMs · parent topic: What Is Machine Learning?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/ai-ml/01-deep-learning`
- **Prerequisites:** What Is Machine Learning?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Machine Learning?; What Is a Neural Network?; Understanding Supervised vs Unsupervised Learning
- **Recommended structure:** 
    - ما هو التعلّم العميق وكيف يختلف عن ML التقليدي
    - الشبكات العصبية العميقة (طبقات، ميزات مُتعلّمة)
    - متى نحتاج DL مقابل ML كلاسيكي
    - أمثلة (رؤية/لغة)
    - علاقته بـ AI (تمهيد لمقارنة 126)
    - ماذا بعد → 099, 103 Transformers
- **Technical verification:** 
    - حدود DL دقيقة; لا مبالغة
    - تمييز واضح عن 126 (comparison) لتجنّب التنافس
- **Internal linking targets:** 097 What Is ML; 099 Neural Network; 103 Transformers; 126 AI vs ML vs DL
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; **guardrail:** Overlaps TCF-000126 on the ML-vs-DL axis: THIS is the Deep-Learning concept page. Cross-link 126.

### 14. TCF-000162 — What Is Redis and How Does In-Memory Caching Work?

- **Cluster / parent:** Redis & Caching · parent topic: What Is Redis?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/redis/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Redis Data Types: Strings, Lists, Sets, and Hashes; What Is Redis Persistence? RDB vs AOF Explained; Understanding Redis Pub/Sub
- **Recommended structure:** 
    - ما هو Redis (مخزن بيانات في الذاكرة)
    - كيف يعمل التخزين المؤقت في الذاكرة (سرعة مقابل الديمومة)
    - حالات استخدام (cache/session/queue/leaderboard)
    - Redis مقابل قاعدة بيانات تقليدية (تمهيد لـ 176)
    - تحذير: الديمومة (تمهيد لـ 164)
    - ماذا بعد → 163 Data Types, 167 Install
- **Technical verification:** 
    - إصدار Redis حديث (8.x 2026)
    - أوامر دقيقة
- **Internal linking targets:** 163 Data Types; 167 Install Redis; 175 Redis vs Memcached; 172 Redis Cheat Sheet
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 15. TCF-000163 — Understanding Redis Data Types: Strings, Lists, Sets, and Hashes

- **Cluster / parent:** Redis & Caching · parent topic: What Is Redis?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/redis/01-data-types`
- **Prerequisites:** What Is Redis?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Redis and How Does In-Memory Caching Work?; What Is Redis Persistence? RDB vs AOF Explained; Understanding Redis Pub/Sub
- **Recommended structure:** 
    - الأنواع الأساسية: strings/lists/sets/hashes
    - أمثلة أوامر لكل نوع (قابلة للتشغيل)
    - متى تستخدم كل نوع
    - sorted sets + أنواع متقدمة (نظرة)
    - أخطاء نمذجة شائعة
    - ماذا بعد → 169 Expiration, 168 Caching
- **Technical verification:** 
    - كل أمر مُتحقَّق منه على Redis 8.x
    - بناء الجملة صحيح
- **Internal linking targets:** 162 What Is Redis; 168 Caching in Node; 179 Leaderboard Project; 172 Cheat Sheet
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 16. TCF-000183 — What Are PostgreSQL Schemas and How Do They Organize Data?

- **Cluster / parent:** PostgreSQL Administration · parent topic: PostgreSQL Architecture
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/postgresql/01-schemas`
- **Prerequisites:** PostgreSQL Architecture
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding PostgreSQL's MVCC (Multi-Version Concurrency Control); Understanding PostgreSQL Data Types Beyond Standard SQL: JSONB and Arrays; What Is a PostgreSQL Extension?
- **Recommended structure:** 
    - ما هي مخطّطات PostgreSQL (namespaces منطقية)
    - كيف تنظّم الجداول/الكائنات
    - search_path والوصول
    - حالات استخدام (multi-tenant تمهيد لـ 204)
    - مقابل قواعد بيانات منفصلة
    - ماذا بعد → 184 JSONB, 182 MVCC
- **Technical verification:** 
    - SQL مُتحقَّق منه على PostgreSQL 17+
    - سلوك search_path دقيق
    - تسلسل: قبل 182 MVCC
- **Internal linking targets:** 182 MVCC; 184 JSONB & Arrays; 204 Multi-Tenant Schema; sql track (cross-link)
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 17. TCF-000182 — Understanding PostgreSQL's MVCC (Multi-Version Concurrency Control)

- **Cluster / parent:** PostgreSQL Administration · parent topic: PostgreSQL Architecture
- **Type · audience · intent:** Concept · متوسّط–متقدّم · Educational
- **Proposed URL/slug:** `/learn/postgresql/02-mvcc`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Are PostgreSQL Schemas and How Do They Organize Data?; Understanding PostgreSQL Data Types Beyond Standard SQL: JSONB and Arrays; What Is a PostgreSQL Extension?
- **Recommended structure:** 
    - مشكلة القراءة/الكتابة المتزامنة
    - ما هو MVCC (نسخ متعدّدة، snapshots)
    - كيف يتجنّب PostgreSQL الأقفال للقراءة
    - تكلفة: bloat وحاجة VACUUM (رابط 186)
    - مقابل نماذج التزامن الأخرى
    - ماذا بعد → 186 VACUUM, 197 Deadlocks
- **Technical verification:** 
    - دقّة تقنية عالية (concept متقدّم)
    - سلوك MVCC مطابق PostgreSQL الحالي
    - مراجعة تقنية بشرية
- **Internal linking targets:** 183 Schemas; 186 VACUUM; 197 Deadlocks; sql/19-transactions
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 18. TCF-000138 — Understanding PowerShell Cmdlets

- **Cluster / parent:** PowerShell Scripting · parent topic: What Is PowerShell?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/powershell/00-cmdlets`
- **Prerequisites:** What Is PowerShell?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is PowerShell and How Does It Differ from Bash?; What Is the PowerShell Pipeline?; Understanding PowerShell Objects vs Text Streams
- **Recommended structure:** 
    - ما هو PowerShell + ما هي cmdlets (Verb-Noun)
    - بنية cmdlet والمعاملات
    - Get-Help / Get-Command / اكتشاف
    - أمثلة قابلة للتشغيل
    - cmdlets مقابل أوامر cmd/bash
    - ماذا بعد → 139 Pipeline, 142 First Script
- **Technical verification:** 
    - PowerShell 7.x (cross-platform) مقابل Windows PS 5.1 موضّح
    - كل cmdlet يعمل فعليًّا
    - ملاحظة 137 'What Is PowerShell' يسبقه كـ 00-intro
- **Internal linking targets:** 137 What Is PowerShell; 139 Pipeline; 150 Cmdlets Cheat Sheet; linux/16-bash-scripting-basics (contrast)
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 19. TCF-000488 — What Is Entity-Relationship (ER) Modeling?

- **Cluster / parent:** Data Modeling & DB Design · parent topic: What Is ER Modeling?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/database-design/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding One-to-Many vs Many-to-Many Relationships; How to Design a Database Schema from Requirements; What Is Denormalization and When Should You Use It?
- **Recommended structure:** 
    - ما هي نمذجة الكيان-العلاقة (ER)
    - الكيانات/السمات/العلاقات + مخطّط ERD
    - الكاردناليّة (تمهيد لـ 489)
    - من ERD إلى جداول
    - أخطاء نمذجة شائعة (رابط 495)
    - ماذا بعد → 489 Relationships, 490 Schema Design
- **Technical verification:** 
    - تمييز عن sql/20-normalization و mongodb/15-data-modeling (نمذجة مفاهيمية لا صياغة)
    - رموز ERD قياسية
- **Internal linking targets:** 489 One-to-Many vs Many-to-Many; 490 Schema from Requirements; sql/20-normalization; mongodb/15-data-modeling
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 20. TCF-000423 — What Is Web Performance and Why Does It Matter for Users and SEO?

- **Cluster / parent:** Web Performance & a11y · parent topic: What Is Web Performance?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/web-performance/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Core Web Vitals: LCP, INP, and CLS; What Is Lazy Loading?; Understanding the Critical Rendering Path
- **Recommended structure:** 
    - ما هو أداء الويب ولماذا يهم (UX + SEO)
    - ماذا يشعر به المستخدم (تحميل/تفاعل/ثبات)
    - تمهيد Core Web Vitals (رابط 424)
    - أدوات القياس (Lighthouse رابط 431)
    - ميزانية الأداء (فكرة)
    - ماذا بعد → 424 CWV, 426 Critical Path
- **Technical verification:** 
    - ربط SEO دقيق (لا ادعاءات ترتيب مُختلقة)
- **Internal linking targets:** 424 Core Web Vitals; 426 Critical Rendering Path; 431 Lighthouse; 437 SSR vs CSR
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 21. TCF-000424 — Understanding Core Web Vitals: LCP, INP, and CLS

- **Cluster / parent:** Web Performance & a11y · parent topic: What Is Web Performance?
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/web-performance/01-core-web-vitals`
- **Prerequisites:** What Is Web Performance?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Web Performance and Why Does It Matter for Users and SEO?; What Is Lazy Loading?; Understanding the Critical Rendering Path
- **Recommended structure:** 
    - ما هي Core Web Vitals
    - LCP (التحميل)
    - INP (التفاعل) — استبدل FID مارس 2024
    - CLS (الثبات البصري)
    - العتبات الجيدة/تحتاج تحسين/ضعيفة
    - ماذا بعد → 426, 431, 438
- **Technical verification:** 
    - حَسّاس للإصدار: INP بديل FID (مارس 2024) — يجب أن يكون حاليًّا 2026
    - عتبات دقيقة (LCP<2.5s, INP<200ms, CLS<0.1)
- **Internal linking targets:** 423 What Is Web Performance; 431 Lighthouse; 438 Reduce JS Bundle; 442 a11y Mistakes
- **Review gates:** 🔁 Version-verify · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 22. TCF-000376 — How Do Technical Interviews at Tech Companies Actually Work?

- **Cluster / parent:** Interview & Career · parent topic: How Technical Interviews Work
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/interview-prep/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** LeetCode-Style Interviews vs System Design Interviews: What's the Difference?; What Do Interviewers Actually Look For in a Coding Interview?; How Whiteboard Interviews Differ from Take-Home Assignments
- **Recommended structure:** 
    - كيف تعمل المقابلات التقنية فعليًّا (المراحل)
    - أنواع: coding/system-design/behavioral/take-home
    - ما الذي يبحث عنه المُقابِل
    - خريطة التحضير (رابط للمجموعات)
    - توقّعات حسب المستوى (رابط 393)
    - ماذا بعد → 377, 378, 388
- **Technical verification:** 
    - عام وقابل للتطبيق; لا ادعاءات عن شركات محدّدة غير مؤكّدة
- **Internal linking targets:** 377 LeetCode vs System Design; 378 What Interviewers Look For; 388 Common Questions; dsa/23-interview-tips
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 23. TCF-000238 — Understanding CPU Scheduling Algorithms

- **Cluster / parent:** OS & Computer Architecture · parent topic: Process vs Thread
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/operating-systems/01-cpu-scheduling`
- **Prerequisites:** Process vs Thread
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is the Difference Between a Process and a Thread?; What Is Virtual Memory and How Does Paging Work?; Understanding Deadlocks and How Operating Systems Prevent Them
- **Recommended structure:** 
    - ما هي جدولة المعالج ولماذا
    - خوارزميات: FCFS/SJF/RR/Priority
    - preemptive مقابل non-preemptive (رابط 254)
    - مقاييس (turnaround/waiting/response)
    - أمثلة/رسوم توضيحية
    - ماذا بعد → 239 Virtual Memory, 243 Context Switching
- **Technical verification:** 
    - خوارزميات دقيقة; أمثلة حسابية صحيحة
    - ملاحظة 237 process-vs-thread يسبقه
- **Internal linking targets:** 237 Process vs Thread; 243 Context Switching; 254 Preemptive vs Non-Preemptive; 257 Practice Problems
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 24. TCF-000341 — What Is Ruby and What Is It Used For?

- **Cluster / parent:** Ruby · parent topic: What Is Ruby?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/ruby/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Ruby's Object-Oriented Nature; What Are Ruby Blocks, Procs, and Lambdas?; Understanding Ruby Symbols vs Strings
- **Recommended structure:** 
    - ما هي Ruby ولأي شيء تُستخدم
    - فلسفة اللغة (developer happiness)
    - مثال 'hello world' + REPL
    - حالات الاستخدام (Rails، سكربتات)
    - Ruby مقابل Python (تمهيد لـ 356)
    - ماذا بعد → 345 Install, 342 OO Nature
- **Technical verification:** 
    - إصدار Ruby حديث (3.x)
    - الكود يعمل فعليًّا
- **Internal linking targets:** 342 OO Nature; 345 Install Ruby; 356 Ruby vs Python; 357 Ruby on Rails
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 25. TCF-000342 — Understanding Ruby's Object-Oriented Nature

- **Cluster / parent:** Ruby · parent topic: What Is Ruby?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/ruby/01-oop-nature`
- **Prerequisites:** What Is Ruby?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Ruby and What Is It Used For?; What Are Ruby Blocks, Procs, and Lambdas?; Understanding Ruby Symbols vs Strings
- **Recommended structure:** 
    - كل شيء كائن في Ruby
    - الرسائل والدوال (methods)
    - مثال قابل للتشغيل (everything is an object)
    - لماذا يهمّ هذا (مقابل لغات أخرى)
    - تمهيد للأصناف (رابط 350)
    - ماذا بعد → 343 Blocks/Procs, 350 Classes
- **Technical verification:** 
    - الكود يعمل على Ruby 3.x
    - ادعاءات 'كل شيء كائن' دقيقة
- **Internal linking targets:** 341 What Is Ruby; 343 Blocks/Procs/Lambdas; 350 Classes & Modules
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 26. TCF-000261 — What Is a Compiler and How Does It Work?

- **Cluster / parent:** Compilers & Language Theory · parent topic: What Is a Compiler?
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/compilers/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Lexical Analysis (Tokenization); What Is an Abstract Syntax Tree (AST)?; Understanding Parsing: Top-Down vs Bottom-Up
- **Recommended structure:** 
    - ما هو المُترجِم وماذا يفعل
    - مراحل: lexing→parsing→semantic→codegen→optimize
    - source → target (نظرة عامة)
    - مُترجِم مقابل مُفسِّر (تمهيد لـ 265)
    - لماذا تتعلّم هذا
    - ماذا بعد → 262 Lexical Analysis, 263 AST
- **Technical verification:** 
    - مراحل دقيقة; مصطلحات قياسية
- **Internal linking targets:** 262 Lexical Analysis; 263 AST; 265 Compiler vs Interpreter; 270 Compiled vs Interpreted (MERGED→265)
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 27. TCF-000262 — Understanding Lexical Analysis (Tokenization)

- **Cluster / parent:** Compilers & Language Theory · parent topic: What Is a Compiler?
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/compilers/01-lexical-analysis`
- **Prerequisites:** What Is a Compiler?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is a Compiler and How Does It Work?; What Is an Abstract Syntax Tree (AST)?; Understanding Parsing: Top-Down vs Bottom-Up
- **Recommended structure:** 
    - ما هو التحليل المعجمي (tokenization)
    - من أحرف إلى tokens (أمثلة)
    - الأنماط/التعابير المنتظمة والـ lexer
    - مثال مبسّط (tokenizer)
    - علاقته بالمُحلِّل النحوي (parser)
    - ماذا بعد → 263 AST, 264 Parsing
- **Technical verification:** 
    - مثال tokenizer يعمل
    - مصطلحات دقيقة (token/lexeme/pattern)
- **Internal linking targets:** 261 What Is a Compiler; 263 AST; 264 Parsing Top-Down vs Bottom-Up
- **Review gates:** </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

### 28. TCF-000361 — What Is Dart and Why Does Flutter Use It?

- **Cluster / parent:** Dart · parent topic: What Is Dart?
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/dart/00-intro`
- **Prerequisites:** none (entry pillar)
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Understanding Dart's Null Safety; What Are Dart Futures and How Does Asynchronous Programming Work?; Understanding Dart Streams
- **Recommended structure:** 
    - ما هي Dart ولماذا تستخدمها Flutter
    - خصائص اللغة (typed, AOT/JIT, null-safe)
    - مثال 'hello world' (سطر أوامر)
    - Dart خارج Flutter (سكربتات/خوادم)
    - Dart مقابل JavaScript (تمهيد لـ 372)
    - ماذا بعد → 366 Install, 362 Null Safety
- **Technical verification:** 
    - إصدار Dart حديث (3.x)
    - تمييز: هذا مسار لغة مستقل — اربط flutter/01-dart دون تكرار
    - الكود يعمل
- **Internal linking targets:** 362 Null Safety; 366 Install Dart; 372 Dart vs JavaScript; flutter/01-dart (cross-link)
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; **guardrail:** Flutter track teaches Dart in-context (flutter/01-dart, /06-dart-deep, /18-async-future). This is the STANDALONE Dart language track — cross-link Flutter, don't duplicate its Dart intro.

### 29. TCF-000362 — Understanding Dart's Null Safety

- **Cluster / parent:** Dart · parent topic: What Is Dart?
- **Type · audience · intent:** Concept · مبتدئ–متوسّط · Educational
- **Proposed URL/slug:** `/learn/dart/01-null-safety`
- **Prerequisites:** What Is Dart?
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** What Is Dart and Why Does Flutter Use It?; What Are Dart Futures and How Does Asynchronous Programming Work?; Understanding Dart Streams
- **Recommended structure:** 
    - مشكلة null (the billion-dollar mistake)
    - null safety السليم في Dart
    - ? / ! / late / required (أمثلة)
    - الترحيل إلى null safety
    - مقابل معالجة null في لغات أخرى
    - ماذا بعد → 363 Futures, 369 Classes
- **Technical verification:** 
    - سلوك sound null safety مطابق Dart 3.x
    - الأمثلة تُترجم
    - تمييز عن flutter/06-dart-deep (تغطية أعمق)
    - تسلسل: بعد 361
- **Internal linking targets:** 361 What Is Dart; 363 Futures & Async; 370 Error Handling; flutter/06-dart-deep (cross-link)
- **Review gates:** 🔁 Version-verify · </> Code-validate · 👤 Human
- **Quality bar:** ≥90/100; **guardrail:** Flutter track teaches Dart in-context (flutter/01-dart, /06-dart-deep, /18-async-future). This is the STANDALONE Dart language track — cross-link Flutter, don't duplicate its Dart intro.

### 30. TCF-000464 — What Is the Mobile App Lifecycle?

- **Cluster / parent:** Mobile Platforms · parent topic: Native vs Cross-Platform
- **Type · audience · intent:** Concept · مبتدئون (جدد على المجال) · Educational
- **Proposed URL/slug:** `/learn/mobile/00-app-lifecycle`
- **Prerequisites:** Native vs Cross-Platform
- **Child topics:** (anchors the cluster; children across Waves 2–7)
- **Related topics:** Native vs Cross-Platform Mobile Development: What's the Difference?; Understanding Mobile App State Management Approaches; What Are Push Notifications and How Do They Work Under the Hood?
- **Recommended structure:** 
    - ما هي دورة حياة تطبيق الجوال
    - الحالات: foreground/background/suspended/terminated
    - أحداث دورة الحياة (iOS مقابل Android)
    - لماذا تهم (حفظ الحالة/الموارد)
    - أخطاء شائعة
    - ماذا بعد → 465 State Mgmt, 466 Push Notifications
- **Technical verification:** 
    - أحداث دورة الحياة دقيقة لكل من iOS/Android الحالي
    - ملاحظة 463 native-vs-cross يسبقه
- **Internal linking targets:** 463 Native vs Cross-Platform; 465 State Management; 471 Flutter vs React Native; flutter/kotlin/swift (cross-link)
- **Review gates:** 👤 Human
- **Quality bar:** ≥90/100; no cross-page conflict

---

## 5. Recommended production order (rationale)

1. **Pillars 1–3 — the dependency hubs** (`097` ML · `398` Unit Testing · `072` IaC). They gate the
   most downstream pages (39/24/24 dependents); nothing in AI, Testing, or Terraform can be written
   coherently until these exist.
2. **Pillars 4–8 — cloud/infra spine** (AWS, Kubernetes ×2, Terraform, System Design) — highest
   career demand + largest content gaps.
3. **Pillars 9–11 — security clusters** (OAuth, SOC, Pentest) — sequenced together so the
   **security reviewer** is engaged in one focused pass.
4. **Pillars 12–30** — the remaining language/data/theory/mobile anchors, each respecting
   intra-cluster order (`183`→`182`, `361`→`362`, `037`→`038`, `097`→`098`, `162`→`163`,
   `261`→`262`, `341`→`342`, `398`→`399`, `423`→`424`).

**Two sequencing notes carried from the audits** (both pillars stay in Wave 1; only learner-facing
order shifts): PostgreSQL leads with `183` Schemas before `182` MVCC; Dart `361` before `362`.
Also note three clusters have a lower-priority *intro* that should precede the P0 pillar in the
finished track (`137`→`138` PowerShell, `237`→`238` OS, `463`→`464` Mobile) — flagged per pillar.

---

## 6. Blockers & readiness

- **No blocking issues.** All 30 pillars are mapped (topic, type, audience, intent, cluster,
  prerequisites, children, related, slug, structure, verification, links, review gates, quality bar).
- **Non-blocking prerequisites to production:** (a) run `create-new-track` for each new track before
  scaffolding; (b) engage a **security reviewer** for pillars `443`/`276`/`312`; (c) apply the two
  cross-link edits to `devops/22` and `devops/12` when `037`/`072` ship.
