import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * THE CODE FIX — Content Governance System, §27–28 pipeline.
 *
 * Deterministically turns the raw candidate backlog into a de-duplicated,
 * prioritized, wave-sequenced decision dataset. Reproducible & auditable:
 * all scoring weights and MERGE/UPDATE/cannibalization overrides live here.
 *
 *   input : docs/content-backlog/batch-001.json   (raw candidates, never mutated)
 *   output: content/data/content-backlog.json      (497 traceable decision records)
 *
 * This produces NO article bodies — it is the intelligence/architecture layer.
 * Companion narrative: docs/content-roadmap.md
 *
 * Run:  node scripts/build-content-backlog.mjs
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const src = read("docs/content-backlog/batch-001.json");

// ---------- 2. Normalization ----------
const ALIASES = [
  [/\bk8s\b/gi, "kubernetes"], [/\bpostgres\b/gi, "postgresql"], [/\bps\b/gi, "powershell"],
  [/\biac\b/gi, "infrastructure as code"], [/\bml\b/gi, "machine learning"],
  [/\bllms?\b/gi, "large language model"], [/\bci\/cd\b/gi, "cicd"],
];
const normTitle = (t) => {
  let s = t.toLowerCase();
  for (const [re, rep] of ALIASES) s = s.replace(re, rep);
  return s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
};
const topicKey = (t) => normTitle(t)
  .replace(/^(what is|what are|what do|understanding|how to|how do|how does|how|the)\b/g, "")
  .replace(/\b(and|the|a|an|of|in|for|to|with|your|first|explained|actually|does it matter|why)\b/g, " ")
  .replace(/\s+/g, " ").trim();
const tokens = (t) => new Set(normTitle(t).split(" ").filter((w) => w.length > 2 &&
  !["what", "how", "the", "and", "for", "with", "your", "does", "are", "use", "when", "should", "which", "into"].includes(w)));
const jaccard = (a, b) => {
  const A = tokens(a), B = tokens(b); let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni;
};

// ---------- Domain metadata (cluster / gap / career) ----------
const DOMAIN = {
  "Cloud Computing (AWS)":                   { cluster: "AWS Cloud Foundations",        gap: "high", career: "high" },
  "Kubernetes":                              { cluster: "Kubernetes & Orchestration",   gap: "high", career: "high" },
  "Terraform & Infrastructure as Code":      { cluster: "Terraform / IaC",              gap: "high", career: "high" },
  "AI, Machine Learning & LLMs":             { cluster: "AI, ML & LLMs",                gap: "high", career: "high" },
  "PowerShell":                              { cluster: "PowerShell Scripting",         gap: "high", career: "med"  },
  "Redis":                                   { cluster: "Redis & Caching",              gap: "high", career: "med"  },
  "PostgreSQL (Advanced)":                   { cluster: "PostgreSQL Administration",    gap: "med",  career: "high" },
  "System Design & Distributed Systems":     { cluster: "System Design",                gap: "high", career: "high" },
  "Computer Architecture & OS Theory":       { cluster: "OS & Computer Architecture",   gap: "high", career: "med"  },
  "Compilers & Language Theory":             { cluster: "Compilers & Language Theory",  gap: "high", career: "low"  },
  "SOC, Blue Team & Digital Forensics":      { cluster: "SOC & Blue Team",              gap: "high", career: "high" },
  "Penetration Testing & Ethical Hacking":   { cluster: "Offensive Security / Pentest", gap: "high", career: "high" },
  "Ruby":                                    { cluster: "Ruby",                         gap: "high", career: "med"  },
  "Dart":                                    { cluster: "Dart",                         gap: "med",  career: "med"  },
  "Interview Preparation & Career":          { cluster: "Interview & Career",           gap: "high", career: "high" },
  "Software Testing & Engineering Practice": { cluster: "Testing & Eng Practice",       gap: "high", career: "high" },
  "Web Performance & Accessibility":         { cluster: "Web Performance & a11y",       gap: "med",  career: "med"  },
  "Authentication & Authorization":          { cluster: "Auth & Identity",              gap: "med",  career: "high" },
  "Mobile Development Beyond Flutter":       { cluster: "Mobile Platforms",             gap: "med",  career: "med"  },
  "Open Source & Collaboration":             { cluster: "Open Source & Collaboration",  gap: "high", career: "med"  },
  "Database Design & Data Modeling":         { cluster: "Data Modeling & DB Design",    gap: "med",  career: "high" },
};

// ---------- 7/8. Decision overrides (everything else = CREATE) ----------
const MERGE = {
  "TCF-000066": { into: "docker/26-swarm-vs-k8s.mdx (existing)", reason: "Kubernetes-vs-Swarm comparison already exists as a lesson in the Docker track — fold this angle in and expand that page instead of a duplicate." },
  "TCF-000270": { into: "TCF-000265", reason: "Intent-duplicate of 'Compiler vs Interpreter' (265): 'Compiled vs Interpreted Languages' is the same comparison reworded. Merge into 265 as one canonical page." },
  "TCF-000454": { into: "TCF-000446", reason: "Intent-duplicate of 'Session-Based vs Token-Based Authentication' (446): session-cookies-vs-JWT is the same comparison. Merge into 446." },
  "TCF-000449": { into: "TCF-000448", reason: "Subset of 'Passwordless Authentication: Passkeys & WebAuthn' (448): a passkey is the concrete case of passwordless. Merge as a section of 448." },
  "TCF-000462": { into: "TCF-000457", reason: "Intent-duplicate of 'Common Authentication Vulnerabilities & How to Prevent Them' (457): auth mistakes == auth vulnerabilities. Merge into 457." },
  "TCF-000035": { into: "TCF-000010 / TCF-000018 / TCF-000034", reason: "Thin aggregation of existing dedicated AWS security pages (010 Shared Responsibility, 018 IAM least-privilege, 034 secure-S3); a Beginner 'best practices' roundup does not justify an independent URL. Fold its points into those three (orient on 010). [Approved via docs/final-watchlist-audit.md, Cluster A.]" },
};
const UPDATE = {
  "TCF-000481": { target: "devops/10-semantic-versioning.mdx (existing)", reason: "SemVer is already taught in the DevOps track; extend that lesson with the library/public-API + breaking-change angle rather than minting a new page." },
};

// ---------- Cannibalization / scope guardrails ----------
const CANNIBAL = {
  "TCF-000037": "Overlaps devops/22-kubernetes-intro (shallow). Keep as canonical K8s pillar; update devops/22 to cross-link.",
  "TCF-000072": "Overlaps devops/12-iac. Keep as canonical IaC concept for the Terraform cluster; narrow/cross-link devops/12.",
  "TCF-000013": "AWS-CloudFormation-specific; defer the generic IaC concept to TCF-000072. Cross-link.",
  "TCF-000311": "api-security/16-penetration-testing is defensive/overview; keep this as the offensive pentest pillar and cross-link.",
  "TCF-000329": "Offensive/exploit angle of SQLi — distinct intent from cybersecurity/08, api-security/04, sql/21 (all defensive). Cross-link, don't re-teach defense.",
  "TCF-000323": "Offensive angle of command injection vs defensive cybersecurity coverage. Cross-link.",
  "TCF-000447": "MFA basics live in cybersecurity/06-authentication-mfa; scope this to TOTP mechanics. Cross-link.",
  "TCF-000458": "Password-hashing basics in cybersecurity/05-passwords; scope to bcrypt/argon2 implementation. Cross-link.",
  "TCF-000451": "JWT security in cybersecurity/26-jwt-security; scope to Node.js implementation. Cross-link.",
  "TCF-000430": "CSP overlaps cybersecurity/14 & api-security/18 security-headers; keep a focused CSP page and RE-HOME out of Web-Perf into a security cluster. Cross-link.",
  "TCF-000437": "GUARDRAIL (final audit): keep framework-agnostic — fundamentals of CSR vs SSR (rendering location, hydration, SEO, TTFB/TTI tradeoffs, when to choose each). Must be clearly distinct from nextjs/22-rendering-strategies (Next's SSG/SSR/ISR/streaming modes) and nextjs/02-server-client; re-home out of Web-Perf into a rendering/fundamentals grouping; cross-link both as applied follow-ups.",
  "TCF-000432": "Image optimization overlaps nextjs/17-images-fonts (next/image only); keep general (formats/responsive/compression) and cross-link.",
  "TCF-000438": "GUARDRAIL (final audit): keep tooling-agnostic (tree-shaking, code-splitting, bundle analysis, dependency diet). VERIFY scope against nextjs/23-deployment-optimization and react/27-performance-optimization before drafting; cross-link both.",
  "TCF-000412": "Commit messages are touched in git/23-best-practices; keep the engineering-practice framing and cross-link the Git track.",
  "TCF-000411": "Code-review practice vs git/21-github-pull-requests (mechanics); distinct angle. Cross-link.",
  "TCF-000415": "PR-structure vs git/21-github-pull-requests (mechanics); distinct angle. Cross-link.",
  "TCF-000390": "DSA concepts fully covered in the dsa track; keep as an interview problem-set that links dsa lessons — do not re-teach.",
  "TCF-000391": "Algorithm concepts covered in the dsa track; keep as an interview problem-set that links dsa lessons — do not re-teach.",
  "TCF-000392": "Links the sql track for concepts; interview-framed problem set only.",
  "TCF-000216": "A deep microservices track exists; keep this as a System-Design entry concept and cross-link the microservices track.",
  "TCF-000223": "Circuit-breaker relates to microservices track patterns; keep system-design framing and cross-link.",
  "TCF-000224": "Saga relates to microservices/27-outbox-pattern; keep system-design framing and cross-link.",
  "TCF-000217": "API-gateway touched in microservices/rest-api tracks; keep system-design framing and cross-link.",
  "TCF-000196": "sql/28-explain-analysis covers EXPLAIN generally; keep PG-specific (EXPLAIN ANALYZE plan reading). Cross-link.",
  "TCF-000205": "sql/27-query-optimization covers generic tuning; keep PG-specific exercises (pg_stat_statements). Cross-link.",
  "TCF-000491": "Normalization is in sql/20-normalization; keep the denormalization/when-to-break-rules angle. Cross-link.",
  "TCF-000204": "Multi-tenant overlap with TCF-000493: THIS is the PostgreSQL implementation (RLS / schema-per-tenant). Strict scope + cross-link 493.",
  "TCF-000493": "Multi-tenant overlap with TCF-000204: THIS is engine-agnostic data modeling. Strict scope + cross-link 204.",
  "TCF-000098": "Overlaps TCF-000126 on the ML-vs-DL axis: THIS is the Deep-Learning concept page. Cross-link 126.",
  "TCF-000126": "Overlaps TCF-000098: THIS is the AI-superset-ML-superset-DL terminology comparison. Cross-link 098.",
  "TCF-000218": "Overlaps TCF-000226: THIS is the rate-limiting ALGORITHMS explainer (token/leaky bucket, sliding window). Cross-link 226 & Redis 171.",
  "TCF-000226": "Overlaps TCF-000218: THIS is the end-to-end 'design a rate limiter' walkthrough. Cross-link 218.",
  "TCF-000228": "General SQL-vs-NoSQL vs product-specific TCF-000199 (PostgreSQL vs MongoDB). Cross-link.",
  "TCF-000199": "Product-specific vs general TCF-000228 (SQL vs NoSQL). Cross-link.",
  "TCF-000012": "AWS CloudFront page; the canonical CDN concept is TCF-000219 (System Design). Cross-link it.",
  "TCF-000015": "AWS SQS page; the canonical message-queue concept is TCF-000215 (System Design). Cross-link it.",
  "TCF-000021": "AWS ALB how-to; the canonical load-balancing concept is TCF-000209 (System Design). Cross-link it.",
  "TCF-000009": "AWS Auto-Scaling; relates to TCF-000208 (horizontal scaling, System Design). Cross-link.",
  "TCF-000035": "Broad 'AWS security best practices' summary — risk of thinness; must synthesize, not just link 010/018/034. Keep low priority.",
  "TCF-000068": "GUARDRAIL (final audit): preserve its SYNTHESIS purpose — a real K8s hardening guide (pod security standards, network policies, RBAC, secrets, image scanning, admission control). Do NOT turn it into a generic best-practices aggregation of 057/069; if it would only restate them, demote to MERGE. Cross-link 057, 069.",
};
for (const id of ["TCF-000361", "TCF-000362", "TCF-000363", "TCF-000364", "TCF-000365", "TCF-000366", "TCF-000367", "TCF-000368"]) {
  CANNIBAL[id] ||= "Flutter track teaches Dart in-context (flutter/01-dart, /06-dart-deep, /18-async-future). This is the STANDALONE Dart language track — cross-link Flutter, don't duplicate its Dart intro.";
}

// ---------- Dependency in-degree + child map ----------
const byId = new Map(src.map((r) => [r.id, r]));
const keyToId = new Map();
for (const r of src) {
  keyToId.set(topicKey(r.title), r.id);
  if (r.primary_topic) keyToId.set(topicKey(r.primary_topic), r.id);
}
const resolveRef = (str) => {
  const k = topicKey(str);
  if (keyToId.has(k)) return keyToId.get(k);
  let best = null, bestS = 0.6;
  for (const r of src) { const s = jaccard(str, r.title); if (s > bestS) { bestS = s; best = r.id; } }
  return best;
};
const indeg = new Map(src.map((r) => [r.id, 0]));
const childrenOf = new Map(src.map((r) => [r.id, []]));
for (const r of src) {
  const refs = [];
  for (const p of r.prerequisites || []) { const id = resolveRef(p); if (id && id !== r.id) refs.push(id); }
  const par = r.parent_topic ? resolveRef(r.parent_topic) : null;
  if (par && par !== r.id) refs.push(par);
  for (const id of new Set(refs)) { indeg.set(id, indeg.get(id) + 1); childrenOf.get(id).push(r.id); }
}

// ---------- 10. Priority scoring (transparent, sums to 100) ----------
const TYPE_EDU  = { Concept: 11, Tutorial: 9, "Practical Guide": 9, Comparison: 8, "Troubleshooting Guide": 8, "Technical Article": 8, Reference: 6, "Cheat Sheet": 5, Exercise: 7, Project: 9, Quiz: 5 };
const TYPE_USE  = { Concept: 6, Tutorial: 9, "Practical Guide": 10, Comparison: 7, "Troubleshooting Guide": 10, "Technical Article": 6, Reference: 7, "Cheat Sheet": 8, Exercise: 7, Project: 9, Quiz: 5 };
const TYPE_PRAC = { Concept: 4, Tutorial: 8, "Practical Guide": 8, Comparison: 4, "Troubleshooting Guide": 7, "Technical Article": 5, Reference: 5, "Cheat Sheet": 6, Exercise: 7, Project: 8, Quiz: 4 };
const INTENT_VAL = { Troubleshooting: 12, Comparison: 11, Educational: 10, Tutorial: 9, Practical: 8, Reference: 7, Informational: 8, Navigational: 5 };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const scoreRecord = (r) => {
  const dm = DOMAIN[r.subcategory];
  const flagged = !!CANNIBAL[r.id];
  const P0 = r.priority === "P0", P1 = r.priority === "P1";
  const beginner = r.difficulty === "Beginner";
  const isConcept = r.content_type === "Concept";
  const id = indeg.get(r.id) || 0;
  const b = {
    edu:           clamp((TYPE_EDU[r.content_type] || 7) + (beginner ? 4 : r.difficulty === "Intermediate" ? 2 : 0), 0, 15),
    intent:        clamp(INTENT_VAL[r.search_intent] || 7, 0, 12),
    authority:     clamp((dm.gap === "high" ? 8 : dm.gap === "med" ? 6 : 4) + (P0 ? 2 : isConcept && beginner ? 1 : 0), 0, 10),
    usefulness:    clamp(TYPE_USE[r.content_type] || 6, 0, 10),
    dependency:    clamp(3 + id * 2 + (P0 ? 4 : P1 ? 1 : 0), 0, 15),
    practical:     clamp(TYPE_PRAC[r.content_type] || 5, 0, 8),
    gap:           clamp((dm.gap === "high" ? 11 : dm.gap === "med" ? 7 : 4) - (flagged ? 3 : 0), 0, 12),
    career:        clamp(dm.career === "high" ? 8 : dm.career === "med" ? 5 : 3, 0, 8),
    accessibility: ({ Beginner: 5, Intermediate: 3, Advanced: 2, Mixed: 4 })[r.difficulty] ?? 3,
    coverage:      flagged ? 3 : 5,
  };
  return { total: Object.values(b).reduce((x, y) => x + y, 0), breakdown: b, indeg: id };
};

// ---------- Pedagogically-ordered publishing waves (CREATE only) ----------
const waveOf = (r, score) => {
  const t = r.content_type;
  if (r.priority === "P0" && t !== "Project" && t !== "Quiz" && t !== "Exercise") return 1;
  if (t === "Project") return 5;
  if (t === "Quiz" || t === "Exercise") return 7;
  if (t === "Reference" || t === "Cheat Sheet" || t === "Glossary" || t === "Comparison") return 6;
  if (t === "Troubleshooting Guide") return 3;
  if (t === "Practical Guide") return score >= 74 ? 3 : 4;
  if ((t === "Concept" || t === "Technical Article") && score >= 78) return 1;
  if (r.difficulty === "Advanced") return 4;
  if (score >= 72) return 2;
  if (score >= 64) return 3;
  return 4;
};

// ---------- Emit ----------
const out = src.map((r) => {
  const dm = DOMAIN[r.subcategory];
  let status = "CREATE";
  let reason = "Unique intent + unique value in a domain the site does not yet cover; passes the §7 page-existence test.";
  if (MERGE[r.id]) { status = "MERGE"; reason = MERGE[r.id].reason; }
  else if (UPDATE[r.id]) { status = "UPDATE"; reason = UPDATE[r.id].reason; }

  const sc = scoreRecord(r);
  const kids = childrenOf.get(r.id).map((id) => byId.get(id).title);
  let cann;
  if (status === "MERGE") cann = `RESOLVED via MERGE -> ${MERGE[r.id].into}. This candidate WAS the cannibalization risk; folding it in eliminates the duplicate.`;
  else if (status === "UPDATE") cann = `RESOLVED via UPDATE -> ${UPDATE[r.id].target}. Intent already served by an existing page; enrich it instead of competing.`;
  else cann = CANNIBAL[r.id] || (dm.gap === "high"
    ? "None — net-new topic in a domain with no existing track."
    : "Low — distinct intent/depth from the adjacent existing track; cross-link at authoring time.");

  return {
    id: r.id,
    original_title: r.title,
    normalized_title: r.title.replace(/\s+/g, " ").trim(),
    topic_key: topicKey(r.title),
    status,
    decision_reason: reason,
    merge_into: MERGE[r.id] ? MERGE[r.id].into : UPDATE[r.id] ? UPDATE[r.id].target : null,
    content_type: r.content_type,
    intent: r.search_intent,
    domain: r.subcategory,
    category: r.category,
    cluster: dm.cluster,
    difficulty: r.difficulty,
    priority_score: sc.total,
    priority_band: r.priority,
    score_breakdown: sc.breakdown,
    dependency_indegree: sc.indeg,
    publishing_wave: status === "CREATE" ? waveOf(r, sc.total) : null,
    parent_topic: r.parent_topic || null,
    child_topics: kids,
    prerequisites: r.prerequisites || [],
    related_topics: r.related_topics || [],
    next_learning_step: (r.related_topics && r.related_topics[0]) || kids[0] || null,
    cannibalization_risk: cann,
  };
});

fs.mkdirSync(path.join(ROOT, "content/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "content/data/content-backlog.json"), JSON.stringify(out, null, 2) + "\n");

const by = (k) => out.reduce((a, r) => ((a[r[k]] = (a[r[k]] || 0) + 1), a), {});
console.log("content-backlog.json written:", out.length, "records");
console.log("status:", JSON.stringify(by("status")));
console.log("clusters:", new Set(out.map((r) => r.cluster)).size);
const waves = out.filter((r) => r.status === "CREATE").reduce((a, r) => ((a[r.publishing_wave] = (a[r.publishing_wave] || 0) + 1), a), {});
console.log("waves:", JSON.stringify(waves));
