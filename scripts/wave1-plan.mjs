import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Generates docs/wave-1-production-plan.md for the 30 Wave-1 pillars.
 * Prereq/child/related come from content/data/content-backlog.json (accurate);
 * per-pillar production metadata (slug, review flags, structure, verification,
 * links) is defined here. NO article bodies are written. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(fs.readFileSync(path.join(ROOT, "content/data/content-backlog.json"), "utf8"));
const byId = new Map(d.map((r) => [r.id, r]));

// Production order (dependency hubs first, then career/gap priority; respects
// intra-cluster sequencing from the audits: 183<182, 361<362, 037<038, 072<073,
// 097<098, 162<163, 261<262, 341<342, 398<399, 423<424).
const ORDER = [
  "TCF-000097","TCF-000398","TCF-000072",                               // 3 mega-hubs
  "TCF-000001","TCF-000037","TCF-000038","TCF-000073","TCF-000207",     // infra/cloud
  "TCF-000443","TCF-000276","TCF-000312",                              // security (review-gated)
  "TCF-000399","TCF-000098","TCF-000162","TCF-000163",
  "TCF-000183","TCF-000182","TCF-000138","TCF-000488",
  "TCF-000423","TCF-000424","TCF-000376","TCF-000238",
  "TCF-000341","TCF-000342","TCF-000261","TCF-000262",
  "TCF-000361","TCF-000362","TCF-000464",
];

// Per-pillar production metadata. sec/ver/code = specialized review needs
// (human review is YES for ALL 30 — they are pillar pages, §22).
const M = {
  "TCF-000097": { track:"ai-ml", lesson:"00-intro", sec:0, ver:1, code:0,
    struct:["ما هو تعلّم الآلة (تعريف مبسّط: أنظمة تتعلّم من البيانات لا من قواعد مكتوبة)","لماذا يهم / أين يُستخدم (أمثلة واقعية)","الأنواع: مُوجَّه / غير مُوجَّه / تعزيزي (نظرة سريعة تربط بـ 100)","كيف يتعلّم النموذج (بيانات → تدريب → تنبؤ) بلا رياضيات ثقيلة","ML مقابل البرمجة التقليدية","ماذا تتعلّم بعدها → 098, 099"],
    verify:["مصطلحات 2026 دقيقة (supervised/unsupervised/RL)","لا مبالغة في ادعاءات القدرات; لا إحصاءات مُختلقة"],
    links:["098 Deep Learning","099 Neural Network","100 Supervised vs Unsupervised","126 AI vs ML vs DL"] },
  "TCF-000398": { track:"software-testing", lesson:"00-intro", sec:0, ver:0, code:1,
    struct:["ما هو اختبار الوحدة ولماذا (تعريف + قيمة عملية)","تشريح اختبار: arrange/act/assert","مثال بسيط قابل للتشغيل (لغة محايدة أو JS)","ما الذي يستحق اختبار وحدة وما لا","أخطاء المبتدئين","ماذا بعد → 399 هرم الاختبار, 400 TDD"],
    verify:["الكود مترجم/يعمل فعليًّا","إطار الاختبار المذكور حديث (Jest/PyTest إصدار 2026)"],
    links:["399 Testing Pyramid","400 TDD","407 Write Your First Unit Test","react/23-testing (cross-link)"] },
  "TCF-000072": { track:"terraform", lesson:"00-intro", sec:0, ver:1, code:0,
    struct:["ما هي البنية ككود (مشكلة الإعداد اليدوي → الحل)","تصريحي مقابل أمري","idempotency وحالة البنية (تمهيد لـ 074)","أدوات النظام البيئي (Terraform/OpenTofu/CloudFormation)","لماذا يهم للفرق","ماذا بعد → 073 Terraform"],
    verify:["يجب أن يتقاطع مع devops/12-iac بلا تكرار (canonical هنا)","تحديث devops/12 للربط","مصطلحات محدّثة (OpenTofu موجود)"],
    links:["073 What Is Terraform","013 CloudFormation","087 Terraform vs Ansible","devops/12-iac (UPDATE cross-link)"] },
  "TCF-000001": { track:"aws", lesson:"00-intro", sec:0, ver:1, code:0,
    struct:["ما هي الحوسبة السحابية (تعريف مبسّط)","سحابي مقابل on-premises (جدول مقارنة)","نماذج الخدمة IaaS/PaaS/SaaS (تمهيد لـ 002)","لماذا الشركات تهاجر للسحابة","المزودون الكبار (AWS/Azure/GCP)","ماذا بعد → 003 EC2, 005 IAM"],
    verify:["أسماء/خدمات AWS دقيقة 2026","لا أسعار مُختلقة"],
    links:["002 IaaS/PaaS/SaaS","003 EC2","005 IAM","031 AWS vs Azure vs GCP","networking/21-cloud-networking"] },
  "TCF-000037": { track:"kubernetes", lesson:"00-intro", sec:0, ver:1, code:1,
    struct:["مشكلة تشغيل الحاويات على نطاق واسع","ما هو Kubernetes وما يحلّه (orchestration)","مفاهيم عليا: cluster/node/pod (تمهيد)","متى تحتاجه ومتى لا (لا تفرط في الهندسة)","علاقته بـ Docker","ماذا بعد → 038 المعمارية"],
    verify:["canonical مقابل devops/22-kubernetes-intro — حدّث devops/22 للربط","إصدار K8s API حديث (1.3x 2026)"],
    links:["038 Architecture","039 Pods","066 K8s vs Swarm (MERGED→docker/26)","devops/22-kubernetes-intro (UPDATE)","docker/26-swarm-vs-k8s"] },
  "TCF-000038": { track:"kubernetes", lesson:"01-architecture", sec:0, ver:1, code:1,
    struct:["مستوى التحكّم (API server, etcd, scheduler, controller-manager)","عُقد العمل (kubelet, kube-proxy, container runtime)","كيف تتدفّق طلبات النشر عبر المكوّنات","مخطّط معماري","أخطاء فهم شائعة","ماذا بعد → 039 Pods, 040 Deployments"],
    verify:["أسماء المكوّنات دقيقة (containerd runtime، dockershim محذوف)","مخطّط صحيح تقنيًّا"],
    links:["037 What Is Kubernetes","039 Pods","069 RBAC","061 kubectl Cheat Sheet"] },
  "TCF-000073": { track:"terraform", lesson:"01-what-is-terraform", sec:0, ver:1, code:1,
    struct:["ما هو Terraform (محرّك IaC، HCL، providers)","دورة العمل write→plan→apply","مثال HCL بسيط (provider + resource)","الحالة (state) لماذا توجد","Terraform مقابل بدائل","ماذا بعد → 074 State, 076 Modules"],
    verify:["HCL يُنفَّذ فعليًّا (terraform validate)","إصدار Terraform/OpenTofu حديث","provider AWS محدّث"],
    links:["072 What Is IaC","074 State Files","078 First Config","083 Terraform CLI Cheat Sheet"] },
  "TCF-000207": { track:"system-design", lesson:"00-intro", sec:0, ver:0, code:0,
    struct:["ما هو تصميم الأنظمة ولماذا يهم للمهندسين","المتطلبات الوظيفية/غير الوظيفية","المفاضلات الأساسية (scalability/reliability/cost)","خريطة الموضوعات القادمة (scaling/LB/caching/CAP)","إطار مقابلة تصميم الأنظمة (نظرة)","ماذا بعد → 208 Scaling, 209 Load Balancing"],
    verify:["مفاهيم دقيقة; اربط microservices track بلا تكرار"],
    links:["208 Horizontal vs Vertical Scaling","209 Load Balancing","210 CAP","microservices track (cross-link)"] },
  "TCF-000443": { track:"authentication", lesson:"01-oauth2", sec:1, ver:1, code:1,
    struct:["مشكلة التفويض المُفوَّض (لماذا لا نشارك كلمات المرور)","أدوار OAuth 2.0 (resource owner/client/auth server/resource server)","تدفّق Authorization Code + PKCE (المخطّط)","access/refresh tokens, scopes","أخطاء أمنية شائعة (تمهيد لـ 457)","ماذا بعد → 444 OIDC, 450 Google login"],
    verify:["مطابق RFC 6749 + أفضل ممارسات 2026 (PKCE إلزامي، implicit flow مهجور)","تمييز عن cybersecurity/26-jwt-security & api-security/02"],
    links:["444 OIDC vs OAuth","446 Session vs Token","450 OAuth Google","456 Grant Types Reference","api-security/02-authentication"] },
  "TCF-000276": { track:"soc", lesson:"00-intro", sec:1, ver:0, code:0,
    struct:["ما هو مركز عمليات الأمن (SOC) ودوره","الأشخاص/العمليات/التقنيات (SIEM/EDR/SOAR)","مستويات محلّلي SOC (T1/T2/T3)","دورة الحياة: رصد→تحليل→استجابة","SOC مقابل الفريق الأحمر","ماذا بعد → 278 SIEM, 279 IR Lifecycle"],
    verify:["مراجعة أمنية بشرية إلزامية (§22)","أدوات/أطر دقيقة (MITRE ATT&CK حالي)","لا تعليمات هجومية"],
    links:["277 Blue vs Red Team","278 SIEM","305 SIEM vs EDR","cybersecurity/16-incident-response (cross-link)"] },
  "TCF-000312": { track:"pentesting", lesson:"00-intro", sec:1, ver:0, code:0,
    struct:["مراحل اختبار الاختراق (recon→scanning→exploitation→post-exploitation→reporting)","النطاق والتفويض القانوني (تأكيد مبكّر)","الفرق عن فحص الثغرات","منهجيات (PTES/OWASP WSTG نظرة)","الحدود الأخلاقية (رابط لـ 339)","ماذا بعد → 313 Recon, 324 Lab Setup"],
    verify:["مراجعة أمنية بشرية إلزامية (§22)","تأطير دفاعي/تعليمي; تأكيد التفويض القانوني؛ لا استهداف أنظمة حيّة","تمييز عن api-security/16-penetration-testing"],
    links:["311 Pentest vs Vuln Scan","324 Pentest Lab (Legally)","339 Legal & Ethical Boundaries","api-security/16-penetration-testing"] },
  "TCF-000399": { track:"software-testing", lesson:"01-testing-pyramid", sec:0, ver:0, code:0,
    struct:["ما هو هرم الاختبار (unit/integration/E2E)","لماذا القاعدة عريضة (سرعة/تكلفة/ثقة)","مضادّ النمط: مخروط الآيس كريم","توزيع عملي للاختبارات","ربط بكل طبقة (403 integration, 404 E2E)","ماذا بعد → 400 TDD"],
    verify:["نسب/توصيات متوازنة لا مطلقة"],
    links:["398 What Is Unit Testing","403 Integration Testing","404 E2E Testing","417 Unit vs Integration"] },
  "TCF-000098": { track:"ai-ml", lesson:"01-deep-learning", sec:0, ver:1, code:0,
    struct:["ما هو التعلّم العميق وكيف يختلف عن ML التقليدي","الشبكات العصبية العميقة (طبقات، ميزات مُتعلّمة)","متى نحتاج DL مقابل ML كلاسيكي","أمثلة (رؤية/لغة)","علاقته بـ AI (تمهيد لمقارنة 126)","ماذا بعد → 099, 103 Transformers"],
    verify:["حدود DL دقيقة; لا مبالغة","تمييز واضح عن 126 (comparison) لتجنّب التنافس"],
    links:["097 What Is ML","099 Neural Network","103 Transformers","126 AI vs ML vs DL"] },
  "TCF-000162": { track:"redis", lesson:"00-intro", sec:0, ver:1, code:1,
    struct:["ما هو Redis (مخزن بيانات في الذاكرة)","كيف يعمل التخزين المؤقت في الذاكرة (سرعة مقابل الديمومة)","حالات استخدام (cache/session/queue/leaderboard)","Redis مقابل قاعدة بيانات تقليدية (تمهيد لـ 176)","تحذير: الديمومة (تمهيد لـ 164)","ماذا بعد → 163 Data Types, 167 Install"],
    verify:["إصدار Redis حديث (8.x 2026)","أوامر دقيقة"],
    links:["163 Data Types","167 Install Redis","175 Redis vs Memcached","172 Redis Cheat Sheet"] },
  "TCF-000163": { track:"redis", lesson:"01-data-types", sec:0, ver:1, code:1,
    struct:["الأنواع الأساسية: strings/lists/sets/hashes","أمثلة أوامر لكل نوع (قابلة للتشغيل)","متى تستخدم كل نوع","sorted sets + أنواع متقدمة (نظرة)","أخطاء نمذجة شائعة","ماذا بعد → 169 Expiration, 168 Caching"],
    verify:["كل أمر مُتحقَّق منه على Redis 8.x","بناء الجملة صحيح"],
    links:["162 What Is Redis","168 Caching in Node","179 Leaderboard Project","172 Cheat Sheet"] },
  "TCF-000183": { track:"postgresql", lesson:"01-schemas", sec:0, ver:1, code:1,
    struct:["ما هي مخطّطات PostgreSQL (namespaces منطقية)","كيف تنظّم الجداول/الكائنات","search_path والوصول","حالات استخدام (multi-tenant تمهيد لـ 204)","مقابل قواعد بيانات منفصلة","ماذا بعد → 184 JSONB, 182 MVCC"],
    verify:["SQL مُتحقَّق منه على PostgreSQL 17+","سلوك search_path دقيق","تسلسل: قبل 182 MVCC"],
    links:["182 MVCC","184 JSONB & Arrays","204 Multi-Tenant Schema","sql track (cross-link)"] },
  "TCF-000182": { track:"postgresql", lesson:"02-mvcc", sec:0, ver:1, code:0,
    struct:["مشكلة القراءة/الكتابة المتزامنة","ما هو MVCC (نسخ متعدّدة، snapshots)","كيف يتجنّب PostgreSQL الأقفال للقراءة","تكلفة: bloat وحاجة VACUUM (رابط 186)","مقابل نماذج التزامن الأخرى","ماذا بعد → 186 VACUUM, 197 Deadlocks"],
    verify:["دقّة تقنية عالية (concept متقدّم)","سلوك MVCC مطابق PostgreSQL الحالي","مراجعة تقنية بشرية"],
    links:["183 Schemas","186 VACUUM","197 Deadlocks","sql/19-transactions"] },
  "TCF-000138": { track:"powershell", lesson:"00-cmdlets", sec:0, ver:1, code:1,
    struct:["ما هو PowerShell + ما هي cmdlets (Verb-Noun)","بنية cmdlet والمعاملات","Get-Help / Get-Command / اكتشاف","أمثلة قابلة للتشغيل","cmdlets مقابل أوامر cmd/bash","ماذا بعد → 139 Pipeline, 142 First Script"],
    verify:["PowerShell 7.x (cross-platform) مقابل Windows PS 5.1 موضّح","كل cmdlet يعمل فعليًّا","ملاحظة 137 'What Is PowerShell' يسبقه كـ 00-intro"],
    links:["137 What Is PowerShell","139 Pipeline","150 Cmdlets Cheat Sheet","linux/16-bash-scripting-basics (contrast)"] },
  "TCF-000488": { track:"database-design", lesson:"00-intro", sec:0, ver:0, code:0,
    struct:["ما هي نمذجة الكيان-العلاقة (ER)","الكيانات/السمات/العلاقات + مخطّط ERD","الكاردناليّة (تمهيد لـ 489)","من ERD إلى جداول","أخطاء نمذجة شائعة (رابط 495)","ماذا بعد → 489 Relationships, 490 Schema Design"],
    verify:["تمييز عن sql/20-normalization و mongodb/15-data-modeling (نمذجة مفاهيمية لا صياغة)","رموز ERD قياسية"],
    links:["489 One-to-Many vs Many-to-Many","490 Schema from Requirements","sql/20-normalization","mongodb/15-data-modeling"] },
  "TCF-000423": { track:"web-performance", lesson:"00-intro", sec:0, ver:0, code:0,
    struct:["ما هو أداء الويب ولماذا يهم (UX + SEO)","ماذا يشعر به المستخدم (تحميل/تفاعل/ثبات)","تمهيد Core Web Vitals (رابط 424)","أدوات القياس (Lighthouse رابط 431)","ميزانية الأداء (فكرة)","ماذا بعد → 424 CWV, 426 Critical Path"],
    verify:["ربط SEO دقيق (لا ادعاءات ترتيب مُختلقة)"],
    links:["424 Core Web Vitals","426 Critical Rendering Path","431 Lighthouse","437 SSR vs CSR"] },
  "TCF-000424": { track:"web-performance", lesson:"01-core-web-vitals", sec:0, ver:1, code:0,
    struct:["ما هي Core Web Vitals","LCP (التحميل)","INP (التفاعل) — استبدل FID مارس 2024","CLS (الثبات البصري)","العتبات الجيدة/تحتاج تحسين/ضعيفة","ماذا بعد → 426, 431, 438"],
    verify:["حَسّاس للإصدار: INP بديل FID (مارس 2024) — يجب أن يكون حاليًّا 2026","عتبات دقيقة (LCP<2.5s, INP<200ms, CLS<0.1)"],
    links:["423 What Is Web Performance","431 Lighthouse","438 Reduce JS Bundle","442 a11y Mistakes"] },
  "TCF-000376": { track:"interview-prep", lesson:"00-intro", sec:0, ver:0, code:0,
    struct:["كيف تعمل المقابلات التقنية فعليًّا (المراحل)","أنواع: coding/system-design/behavioral/take-home","ما الذي يبحث عنه المُقابِل","خريطة التحضير (رابط للمجموعات)","توقّعات حسب المستوى (رابط 393)","ماذا بعد → 377, 378, 388"],
    verify:["عام وقابل للتطبيق; لا ادعاءات عن شركات محدّدة غير مؤكّدة"],
    links:["377 LeetCode vs System Design","378 What Interviewers Look For","388 Common Questions","dsa/23-interview-tips"] },
  "TCF-000238": { track:"operating-systems", lesson:"01-cpu-scheduling", sec:0, ver:0, code:0,
    struct:["ما هي جدولة المعالج ولماذا","خوارزميات: FCFS/SJF/RR/Priority","preemptive مقابل non-preemptive (رابط 254)","مقاييس (turnaround/waiting/response)","أمثلة/رسوم توضيحية","ماذا بعد → 239 Virtual Memory, 243 Context Switching"],
    verify:["خوارزميات دقيقة; أمثلة حسابية صحيحة","ملاحظة 237 process-vs-thread يسبقه"],
    links:["237 Process vs Thread","243 Context Switching","254 Preemptive vs Non-Preemptive","257 Practice Problems"] },
  "TCF-000341": { track:"ruby", lesson:"00-intro", sec:0, ver:1, code:1,
    struct:["ما هي Ruby ولأي شيء تُستخدم","فلسفة اللغة (developer happiness)","مثال 'hello world' + REPL","حالات الاستخدام (Rails، سكربتات)","Ruby مقابل Python (تمهيد لـ 356)","ماذا بعد → 345 Install, 342 OO Nature"],
    verify:["إصدار Ruby حديث (3.x)","الكود يعمل فعليًّا"],
    links:["342 OO Nature","345 Install Ruby","356 Ruby vs Python","357 Ruby on Rails"] },
  "TCF-000342": { track:"ruby", lesson:"01-oop-nature", sec:0, ver:1, code:1,
    struct:["كل شيء كائن في Ruby","الرسائل والدوال (methods)","مثال قابل للتشغيل (everything is an object)","لماذا يهمّ هذا (مقابل لغات أخرى)","تمهيد للأصناف (رابط 350)","ماذا بعد → 343 Blocks/Procs, 350 Classes"],
    verify:["الكود يعمل على Ruby 3.x","ادعاءات 'كل شيء كائن' دقيقة"],
    links:["341 What Is Ruby","343 Blocks/Procs/Lambdas","350 Classes & Modules"] },
  "TCF-000261": { track:"compilers", lesson:"00-intro", sec:0, ver:0, code:0,
    struct:["ما هو المُترجِم وماذا يفعل","مراحل: lexing→parsing→semantic→codegen→optimize","source → target (نظرة عامة)","مُترجِم مقابل مُفسِّر (تمهيد لـ 265)","لماذا تتعلّم هذا","ماذا بعد → 262 Lexical Analysis, 263 AST"],
    verify:["مراحل دقيقة; مصطلحات قياسية"],
    links:["262 Lexical Analysis","263 AST","265 Compiler vs Interpreter","270 Compiled vs Interpreted (MERGED→265)"] },
  "TCF-000262": { track:"compilers", lesson:"01-lexical-analysis", sec:0, ver:0, code:1,
    struct:["ما هو التحليل المعجمي (tokenization)","من أحرف إلى tokens (أمثلة)","الأنماط/التعابير المنتظمة والـ lexer","مثال مبسّط (tokenizer)","علاقته بالمُحلِّل النحوي (parser)","ماذا بعد → 263 AST, 264 Parsing"],
    verify:["مثال tokenizer يعمل","مصطلحات دقيقة (token/lexeme/pattern)"],
    links:["261 What Is a Compiler","263 AST","264 Parsing Top-Down vs Bottom-Up"] },
  "TCF-000361": { track:"dart", lesson:"00-intro", sec:0, ver:1, code:1,
    struct:["ما هي Dart ولماذا تستخدمها Flutter","خصائص اللغة (typed, AOT/JIT, null-safe)","مثال 'hello world' (سطر أوامر)","Dart خارج Flutter (سكربتات/خوادم)","Dart مقابل JavaScript (تمهيد لـ 372)","ماذا بعد → 366 Install, 362 Null Safety"],
    verify:["إصدار Dart حديث (3.x)","تمييز: هذا مسار لغة مستقل — اربط flutter/01-dart دون تكرار","الكود يعمل"],
    links:["362 Null Safety","366 Install Dart","372 Dart vs JavaScript","flutter/01-dart (cross-link)"] },
  "TCF-000362": { track:"dart", lesson:"01-null-safety", sec:0, ver:1, code:1,
    struct:["مشكلة null (the billion-dollar mistake)","null safety السليم في Dart","? / ! / late / required (أمثلة)","الترحيل إلى null safety","مقابل معالجة null في لغات أخرى","ماذا بعد → 363 Futures, 369 Classes"],
    verify:["سلوك sound null safety مطابق Dart 3.x","الأمثلة تُترجم","تمييز عن flutter/06-dart-deep (تغطية أعمق)","تسلسل: بعد 361"],
    links:["361 What Is Dart","363 Futures & Async","370 Error Handling","flutter/06-dart-deep (cross-link)"] },
  "TCF-000464": { track:"mobile", lesson:"00-app-lifecycle", sec:0, ver:0, code:0,
    struct:["ما هي دورة حياة تطبيق الجوال","الحالات: foreground/background/suspended/terminated","أحداث دورة الحياة (iOS مقابل Android)","لماذا تهم (حفظ الحالة/الموارد)","أخطاء شائعة","ماذا بعد → 465 State Mgmt, 466 Push Notifications"],
    verify:["أحداث دورة الحياة دقيقة لكل من iOS/Android الحالي","ملاحظة 463 native-vs-cross يسبقه"],
    links:["463 Native vs Cross-Platform","465 State Management","471 Flutter vs React Native","flutter/kotlin/swift (cross-link)"] },
};

const AUD = { Beginner: "مبتدئون (جدد على المجال)", Intermediate: "مبتدئ–متوسّط", Advanced: "متوسّط–متقدّم", Mixed: "متعدّد" };
const url = (m) => `/learn/${m.track}/${m.lesson}`;
const yn = (b) => (b ? "✅" : "—");

let md = `# Wave 1 — Production Plan (30 Foundation Pillars)

**Status:** architecture blueprint for the first production sprint. **No article bodies are written
here** — this is the final structural review before writing begins.
**Source of truth:** [\`content/data/content-backlog.json\`](../content/data/content-backlog.json)
(Wave 1 = 30 CREATE pillars). Governed by [\`docs/content-guidelines.md\`](content-guidelines.md).
**Prior gates:** [\`docs/content-roadmap.md\`](content-roadmap.md) ·
[\`docs/pre-production-audit.md\`](pre-production-audit.md) ·
[\`docs/final-watchlist-audit.md\`](final-watchlist-audit.md).

Each pillar anchors one of the 21 new clusters; downstream Waves 2–7 depend on these existing. All
30 will live as the intro/anchor lessons (\`00\`/\`01\`) of **new tracks** — which must each go through
the site's \`create-new-track\` process before scaffolding (per the backlog README). URLs follow the
live pattern \`/learn/[tech]/[lesson]\`.

---

## 1. Review-requirement summary

**Human review: required for all 30** (pillar pages, §22). Specialized gates below.

| Gate | Count | Pillars |
|---|--:|---|
| 🔒 Security review | ${ORDER.filter(id=>M[id].sec).length} | ${ORDER.filter(id=>M[id].sec).map(id=>id.slice(-3)).join(", ")} |
| 🔁 Technical/version verification | ${ORDER.filter(id=>M[id].ver).length} | ${ORDER.filter(id=>M[id].ver).map(id=>id.slice(-3)).join(", ")} |
| \`</>\` Code validation | ${ORDER.filter(id=>M[id].code).length} | ${ORDER.filter(id=>M[id].code).map(id=>id.slice(-3)).join(", ")} |
| 👤 Human review | 30 | ALL |

---

## 2. Master table (production order)

| # | ID | Topic | Type | Audience | Intent | Cluster | Proposed URL | 🔒 | 🔁 | \`</>\` |
|--:|---|---|---|---|---|---|---|:--:|:--:|:--:|
`;
ORDER.forEach((id, i) => {
  const r = byId.get(id), m = M[id];
  md += `| ${i + 1} | ${id.slice(-3)} | ${r.original_title} | ${r.content_type} | ${AUD[r.difficulty]} | ${r.intent} | ${r.cluster} | \`${url(m)}\` | ${yn(m.sec)} | ${yn(m.ver)} | ${yn(m.code)} |\n`;
});

md += `
---

## 3. Shared production standards (apply to every pillar)

**Content structure baseline (§12–§13, beginner-first):** simple explanation → technical
explanation → example → practical application → common mistakes → "what to learn next." Arabic-first
per §14; English technical terms kept where conventional and defined once.

**Quality bar (§21):** each pillar must score **≥ 90/100** before publish (pillars are held to the
highest bar). Non-negotiables: factual accuracy (§10), validated code (§11), original structure
(§9), correct internal links (§17), matched search intent (§16).

**Verification protocol (§10–§11):** verify every version-sensitive claim against the vendor docs in
\`node_modules/next/dist/docs/\` (for Next-adjacent topics) or official sources; run every code/command/
config example; never invent APIs, flags, CVEs, or benchmarks.

**Metadata (§23):** set created/last-verified dates, technology + version, next-review date, status.

---

## 4. Per-pillar detail

`;

ORDER.forEach((id, i) => {
  const r = byId.get(id), m = M[id];
  const gates = [m.sec ? "🔒 Security" : null, m.ver ? "🔁 Version-verify" : null, m.code ? "</> Code-validate" : null, "👤 Human"].filter(Boolean).join(" · ");
  md += `### ${i + 1}. ${id} — ${r.original_title}\n\n`;
  md += `- **Cluster / parent:** ${r.cluster} · parent topic: ${r.parent_topic || "—"}\n`;
  md += `- **Type · audience · intent:** ${r.content_type} · ${AUD[r.difficulty]} · ${r.intent}\n`;
  md += `- **Proposed URL/slug:** \`${url(m)}\`\n`;
  md += `- **Prerequisites:** ${(r.prerequisites || []).join("; ") || "none (entry pillar)"}\n`;
  md += `- **Child topics:** ${(r.child_topics || []).slice(0, 6).join("; ") || "(anchors the cluster; children across Waves 2–7)"}\n`;
  md += `- **Related topics:** ${(r.related_topics || []).slice(0, 3).join("; ") || "—"}\n`;
  md += `- **Recommended structure:** ${m.struct.map((s) => `\n    - ${s}`).join("")}\n`;
  md += `- **Technical verification:** ${m.verify.map((s) => `\n    - ${s}`).join("")}\n`;
  md += `- **Internal linking targets:** ${m.links.join("; ")}\n`;
  md += `- **Review gates:** ${gates}\n`;
  md += `- **Quality bar:** ≥90/100; ${r.cannibalization_risk.startsWith("None") || r.cannibalization_risk.startsWith("Low") ? "no cross-page conflict" : "**guardrail:** " + r.cannibalization_risk}\n\n`;
});

md += `---

## 5. Recommended production order (rationale)

1. **Pillars 1–3 — the dependency hubs** (\`097\` ML · \`398\` Unit Testing · \`072\` IaC). They gate the
   most downstream pages (39/24/24 dependents); nothing in AI, Testing, or Terraform can be written
   coherently until these exist.
2. **Pillars 4–8 — cloud/infra spine** (AWS, Kubernetes ×2, Terraform, System Design) — highest
   career demand + largest content gaps.
3. **Pillars 9–11 — security clusters** (OAuth, SOC, Pentest) — sequenced together so the
   **security reviewer** is engaged in one focused pass.
4. **Pillars 12–30** — the remaining language/data/theory/mobile anchors, each respecting
   intra-cluster order (\`183\`→\`182\`, \`361\`→\`362\`, \`037\`→\`038\`, \`097\`→\`098\`, \`162\`→\`163\`,
   \`261\`→\`262\`, \`341\`→\`342\`, \`398\`→\`399\`, \`423\`→\`424\`).

**Two sequencing notes carried from the audits** (both pillars stay in Wave 1; only learner-facing
order shifts): PostgreSQL leads with \`183\` Schemas before \`182\` MVCC; Dart \`361\` before \`362\`.
Also note three clusters have a lower-priority *intro* that should precede the P0 pillar in the
finished track (\`137\`→\`138\` PowerShell, \`237\`→\`238\` OS, \`463\`→\`464\` Mobile) — flagged per pillar.

---

## 6. Blockers & readiness

- **No blocking issues.** All 30 pillars are mapped (topic, type, audience, intent, cluster,
  prerequisites, children, related, slug, structure, verification, links, review gates, quality bar).
- **Non-blocking prerequisites to production:** (a) run \`create-new-track\` for each new track before
  scaffolding; (b) engage a **security reviewer** for pillars \`443\`/\`276\`/\`312\`; (c) apply the two
  cross-link edits to \`devops/22\` and \`devops/12\` when \`037\`/\`072\` ship.
`;

fs.writeFileSync(path.join(ROOT, "docs/wave-1-production-plan.md"), md);
console.log("wave-1-production-plan.md written.");
console.log("pillars mapped:", ORDER.length, "| all have metadata:", ORDER.every((id) => M[id]) && ORDER.every((id) => byId.get(id)?.publishing_wave === 1));
console.log("security:", ORDER.filter((id) => M[id].sec).map((i) => i.slice(-3)).join(","));
console.log("version:", ORDER.filter((id) => M[id].ver).length, "| code:", ORDER.filter((id) => M[id].code).length);
const w1 = d.filter((r) => r.status === "CREATE" && r.publishing_wave === 1).map((r) => r.id).sort();
const planned = [...ORDER].sort();
console.log("covers all 30 Wave-1 ids:", JSON.stringify(w1) === JSON.stringify(planned));
