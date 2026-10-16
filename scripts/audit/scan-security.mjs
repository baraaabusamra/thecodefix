#!/usr/bin/env node
// scripts/audit/scan-security.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← فاحص الأمان
// Static security scanner. Deterministic checks only — every finding names
// the concrete file/line and says whether it is CONFIRMED or needs a human
// to VERIFY (pattern matches are never declared vulnerabilities on their own).
//
//   SEC-SECRET            hard-coded credentials (keys, tokens, private keys, DB URLs with passwords)
//   SEC-ENV-COMMITTED     a real .env file is tracked by git
//   SEC-PUBLIC-SECRET     NEXT_PUBLIC_* variable whose name suggests a secret (shipped to the browser)
//   SEC-AUTH-MISSING      exported Server Action / API handler with no auth/RBAC call reachable in-file
//   SEC-WEBHOOK-SIG       webhook route without signature verification
//   SEC-RATELIMIT         public (unauthenticated) write endpoint without rateLimit()
//   SEC-XSS               dangerouslySetInnerHTML with something other than JSON.stringify(...)
//   SEC-EVAL              eval / new Function / child_process in app code
//   SEC-SQL-RAW           drizzle sql.raw(...) or string-built SQL
//   SEC-OPEN-REDIRECT     redirect() to a value taken from the request
//   SEC-CSP               CSP is report-only / allows unsafe-inline or unsafe-eval
//   SEC-DEPENDENCY        npm audit advisories (moderate+)
//
// Usage: node scripts/audit/scan-security.mjs [--root DIR] [--files list.txt] [--out FILE] [--branch NAME] [--no-npm-audit]

import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseArgs, targetFiles, trackedFiles, read, Findings, lineOf } from "./lib.mjs";

const args = parseArgs();
const root = args.root;
const req = createRequire(path.join(root, "package.json"));
const ts = req("typescript");
const F = new Findings("security", args.branch);

const isContent = (f) => f.startsWith("src/content/") || f.startsWith("rules/") || f.startsWith("docs/") || f.endsWith(".md") || f.endsWith(".mdc");
const isCode = (f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f) && !isContent(f);
const files = targetFiles(args, (f) => !f.startsWith("node_modules/") && !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf)$/i.test(f));

// ---------------------------------------------------------------- secrets
const SECRET_PATTERNS = [
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["Stripe live key", /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}\b/g],
  ["Stripe test key", /\bsk_test_[0-9a-zA-Z]{20,}\b/g],
  ["Stripe webhook secret", /\bwhsec_[0-9a-zA-Z]{20,}\b/g],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[0-9A-Za-z_]{30,}\b/g],
  ["Slack token", /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Anthropic/OpenAI key", /\bsk-(?:ant-|proj-)?[0-9A-Za-z_-]{32,}\b/g],
  ["Tavily key", /\btvly-[0-9A-Za-z]{20,}\b/g],
  ["DB URL with password", /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s/'"`]+:([^@\s'"`]{6,})@[^\s'"`]+/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
];
const PLACEHOLDER = /x{4,}|\*{3,}|your[_-]?|example|placeholder|password@|pass@|user:pass|<[^>]+>|\$\{|changeme|dummy|test123|secret@|localhost/i;

for (const f of files) {
  let text;
  try {
    text = read(root, f);
  } catch {
    continue;
  }
  if (text.length > 3_000_000) continue;
  for (const [name, re] of SECRET_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const around = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10);
      if (PLACEHOLDER.test(m[0]) || PLACEHOLDER.test(around)) continue;
      const content = isContent(f);
      F.add({
        category: "secret",
        severity: content ? "low" : name.includes("live") || name.includes("Private") ? "critical" : "high",
        file: f,
        line: lineOf(text, m.index),
        rule: "SEC-SECRET",
        message: content
          ? `قيمة شكلها ${name} داخل محتوى تعليمي — تأكد إنها مثال وهمي مش مفتاح حقيقي.`
          : `قيمة شكلها ${name} مكتوبة مباشرة بالكود.`,
        hint: "إذا حقيقية: ألغِها فوراً من لوحة المزوّد، وانقلها لـ .env/Vercel. الحذف من git لحاله ما بيكفي لأنها بالتاريخ.",
        confidence: content ? "verify" : "likely",
      });
    }
  }
}

// ---------------------------------------------------------------- env files
const allTracked = args.files ?? trackedFiles(root);
for (const f of allTracked) {
  const base = path.basename(f);
  if (/^\.env(\..+)?$/.test(base) && !/\.example$|\.sample$|\.template$/.test(base)) {
    F.add({ category: "secret", severity: "critical", file: f, line: 1, rule: "SEC-ENV-COMMITTED", message: "ملف .env حقيقي مرفوع على git.", hint: "احذفه من git، أضفه لـ .gitignore، وغيّر كل المفاتيح اللي فيه.", confidence: "confirmed" });
  }
  if (/service-account.*\.json$|-key\.json$/.test(base)) {
    F.add({ category: "secret", severity: "critical", file: f, line: 1, rule: "SEC-SECRET", message: "ملف مفاتيح Google service account مرفوع على git.", confidence: "confirmed" });
  }
}

// ---------------------------------------------------------------- code analysis
const AUTH_CALLS = new Set(["auth", "resolveAdmin", "can", "getServerSession", "requireUser", "requireAdmin", "requireRole", "requireCapability", "assertCapability", "requireSession", "currentUser", "getCurrentUser", "assertAdmin", "verifyAdminToken"]);
const PUBLIC_API = [
  [/^src\/app\/api\/auth\//, "NextAuth handlers"],
  [/^src\/app\/api\/csp-report\//, "CSP violation reports (public by design)"],
  [/^src\/app\/api\/monitoring\/client-error\//, "browser error reports (public by design)"],
  [/^src\/app\/api\/stripe\/webhook\//, "Stripe webhook (signature instead of session)"],
  [/^src\/app\/api\/cert-og\//, "OG image for public certificates"],
];

for (const f of files.filter(isCode)) {
  const text = read(root, f);
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isServerActions = /^\s*(['"])use server\1/.test(text);
  const routeMatch = /^src\/app\/.*\/route\.tsx?$/.test(f);

  // local function → identifiers it calls
  const localFns = new Map();
  const callsIn = (node) => {
    const set = new Set();
    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const e = n.expression;
        if (ts.isIdentifier(e)) set.add(e.text);
        else if (ts.isPropertyAccessExpression(e)) set.add(e.name.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return set;
  };
  const exported = [];
  for (const st of sf.statements) {
    const isExp = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isFunctionDeclaration(st) && st.name) {
      localFns.set(st.name.text, callsIn(st));
      if (isExp) exported.push([st.name.text, st]);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (d.initializer && ts.isIdentifier(d.name) && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
          localFns.set(d.name.text, callsIn(d.initializer));
          if (isExp) exported.push([d.name.text, d]);
        }
      }
    }
  }
  // Cross-module guards follow the project's naming convention:
  // assertOps(), assertReports(), requireAdminAccess()… (requireDb is not a guard).
  const isGuard = (c) => AUTH_CALLS.has(c) || (/^(assert|require)[A-Z]/.test(c) && c !== "requireDb");
  const WRITE_CALLS = new Set(["insert", "update", "delete", "execute", "transaction", "set", "put", "del"]);
  const reachesAny = (name, pred, seen = new Set()) => {
    if (seen.has(name)) return false;
    seen.add(name);
    for (const c of localFns.get(name) ?? []) {
      if (pred(c)) return true;
      if (localFns.has(c) && reachesAny(c, pred, seen)) return true;
    }
    return false;
  };
  const reachesAuth = (name, seen = new Set()) => {
    if (seen.has(name)) return false;
    seen.add(name);
    for (const c of localFns.get(name) ?? []) {
      if (isGuard(c)) return true;
      if (localFns.has(c) && reachesAuth(c, seen)) return true;
    }
    return false;
  };
  const usesRateLimit = (name) => [...(localFns.get(name) ?? [])].some((c) => c === "rateLimit" || (localFns.has(c) && [...localFns.get(c)].includes("rateLimit")));

  if (isServerActions || routeMatch) {
    const publicReason = PUBLIC_API.find(([re]) => re.test(f))?.[1];
    for (const [name, node] of exported) {
      if (routeMatch && !/^(GET|POST|PUT|PATCH|DELETE)$/.test(name)) continue;
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const authed = reachesAuth(name);
      const limited = usesRateLimit(name);
      // cookie deletes / Map.set are not data writes: require a DB handle in reach
      const touchesDb = reachesAny(name, (c) => c === "requireDb" || c === "select" || c === "insert");
      const writesData = reachesAny(name, (c) => WRITE_CALLS.has(c)) && (touchesDb || /\bdb\./.test(text));
      if ((localFns.get(name)?.size ?? 0) === 0) continue; // no-op stub (e.g. a closed legacy action)
      if (!authed && !publicReason) {
        const isRead = routeMatch && name === "GET";
        // public + rate-limited = deliberate public endpoint → info only
        const severity = limited ? "info" : isRead || !writesData ? "low" : f.includes("/admin/") ? "high" : "medium";
        F.add({
          category: "auth",
          severity,
          file: f,
          line,
          rule: "SEC-AUTH-MISSING",
          message: limited
            ? `«${name}» عام بدون تسجيل دخول، بس محمي بـ rateLimit — تأكد إنه مقصود يكون عام.`
            : `${isServerActions ? "Server Action" : "API " + name} «${name}» ما فيه أي فحص هوية/صلاحية داخل الملف.`,
          hint: "Server Actions نقاط عامة — أي حدا بيقدر يناديها. تأكد إنها مقصودة تكون عامة، أو أضف auth()/resolveAdmin()+can().",
          confidence: "verify",
        });
      }
      const writes = writesData && (isServerActions || (routeMatch && name !== "GET"));
      if (writes && !authed && !limited && !/webhook|auth\//.test(f)) {
        F.add({ category: "abuse", severity: "low", file: f, line, rule: "SEC-RATELIMIT", message: `«${name}» عام وبيكتب بيانات بدون rateLimit().`, hint: "أضف rateLimit(`key:${ip}`, N, windowMs) لمنع الإغراق.", confidence: "verify" });
      }
    }
    if (/webhook/.test(f) && !/constructEvent|verifySignature|timingSafeEqual|svix/.test(text)) {
      F.add({ category: "auth", severity: "high", file: f, line: 1, rule: "SEC-WEBHOOK-SIG", message: "Webhook بدون تحقق من التوقيع.", confidence: "likely" });
    }
  }

  // pattern checks
  const patterns = [
    [/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*(?!JSON\.stringify)([^}]{0,80})/g, "xss", "medium", "SEC-XSS", (m) => `dangerouslySetInnerHTML بقيمة «${m[1].trim().slice(0, 50)}» — لازم تكون HTML موثوق أو معقّم.`, "verify"],
    [/(?<![\w.])eval\s*\(|new\s+Function\s*\(/g, "injection", "high", "SEC-EVAL", () => "تنفيذ نص كـ كود (eval / new Function).", "likely"],
    [/from\s+["'](?:node:)?child_process["']/g, "injection", "medium", "SEC-EVAL", () => "استخدام child_process داخل كود التطبيق.", "verify"],
    [/\bsql\.raw\s*\(/g, "injection", "medium", "SEC-SQL-RAW", () => "sql.raw() بيحط النص بالـ SQL بدون parameters — تأكد إنه مش من مدخل مستخدم.", "verify"],
    [/\bredirect\s*\(\s*(?:searchParams|params|formData\.get|callbackUrl|next|returnTo|url)\b/g, "redirect", "medium", "SEC-OPEN-REDIRECT", () => "redirect() لقيمة جاية من الطلب — ممكن open redirect.", "verify"],
    [/process\.env\.NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*/g, "secret", "high", "SEC-PUBLIC-SECRET", (m) => `${m[0].replace("process.env.", "")} بينبعت للمتصفح — الاسم بيوحي إنه سر.`, "likely"],
  ];
  // A dangerouslySetInnerHTML value is safe when the identifier is a constant
  // template without ${…}, or JSON.stringify(...) with "<" escaped.
  const safeHtmlVar = (expr) => {
    const id = expr.trim().match(/^[A-Za-z_$][\w$]*$/)?.[0];
    if (!id) return false;
    const decl = text.match(new RegExp(`(?:const|let)\\s+${id}\\s*=\\s*([\\s\\S]{0,400})`));
    if (!decl) return false;
    const init = decl[1];
    if (/^JSON\.stringify\([^;]*\)\.replace\(\/</.test(init)) return true;
    const tpl = init.match(/^`([\s\S]*?)`/);
    return !!tpl && !tpl[1].includes("${");
  };
  if (f.startsWith("src/")) {
    for (const [re, category, severity, rule, msg, confidence] of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (rule === "SEC-XSS" && safeHtmlVar(m[1])) continue;
        F.add({ category, severity, file: f, line: lineOf(text, m.index), rule, message: msg(m), confidence });
      }
    }
  }
}

// ---------------------------------------------------------------- CSP / headers
if (files.includes("next.config.ts")) {
  const t = read(root, "next.config.ts");
  const i = t.indexOf("Content-Security-Policy-Report-Only");
  if (i >= 0 && !/["']Content-Security-Policy["']/.test(t))
    F.add({ category: "headers", severity: "medium", file: "next.config.ts", line: lineOf(t, i), rule: "SEC-CSP", message: "الـ CSP شغّال بوضع Report-Only بس — بيسجّل المخالفات بدون ما يمنعها.", hint: "بعد مراجعة تقارير /api/csp-report، فعّل Content-Security-Policy الحقيقي.", confidence: "confirmed" });
  const j = t.search(/script-src[^"\n]*'unsafe-eval'/);
  if (j >= 0)
    F.add({ category: "headers", severity: "low", file: "next.config.ts", line: lineOf(t, j), rule: "SEC-CSP", message: "script-src بيسمح بـ 'unsafe-inline' و'unsafe-eval' — بيضعّف الحماية من XSS.", hint: "استخدم nonce/hash للسكربتات الـ inline، و'wasm-unsafe-eval' بس للـ Python sandbox.", confidence: "confirmed" });
}
if (files.includes("src/lib/rate-limit.ts")) {
  const t = read(root, "src/lib/rate-limit.ts");
  if (/new Map</.test(t))
    F.add({ category: "abuse", severity: "info", file: "src/lib/rate-limit.ts", line: lineOf(t, t.indexOf("new Map")), rule: "SEC-RATELIMIT", message: "الـ rate limiter بالذاكرة لكل instance — بينمسح مع كل cold start ومش مشترك بين السيرفرات.", hint: "مقبول هلأ (موثّق بالتعليق). لـ v2 فكّر بـ Upstash/Redis إذا صار في إساءة.", confidence: "confirmed" });
}

// ---------------------------------------------------------------- npm audit
if (!process.argv.includes("--no-npm-audit") && (args.files === null || args.files.some((f) => /package(-lock)?\.json$/.test(f)))) {
  const r = spawnSync("npm", ["audit", "--json", "--omit=dev"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    const j = JSON.parse(r.stdout);
    const lock = read(root, "package-lock.json");
    for (const [name, v] of Object.entries(j.vulnerabilities ?? {})) {
      if (v.severity === "low" || v.severity === "info") continue;
      const via = (v.via ?? []).filter((x) => typeof x === "object");
      const title = via[0]?.title ?? "advisory";
      const idx = lock.indexOf(`"node_modules/${name}"`);
      F.add({
        category: "dependency",
        severity: v.severity === "critical" ? "critical" : v.severity === "high" ? "high" : "medium",
        file: "package-lock.json",
        line: idx >= 0 ? lineOf(lock, idx) : 1,
        rule: "SEC-DEPENDENCY",
        message: `مكتبة ${name} (${v.range}) فيها ثغرة معروفة: ${title}${v.isDirect ? "" : " — عبر مكتبة ثانية"}.`,
        hint: v.fixAvailable ? `في إصلاح: ${typeof v.fixAvailable === "object" ? `${v.fixAvailable.name}@${v.fixAvailable.version}` : "npm audit fix"}` : "ما في إصلاح لهلأ — راقب.",
        confidence: "confirmed",
      });
    }
    F.meta.npmAudit = j.metadata?.vulnerabilities;
  } catch {
    F.meta.npmAudit = "failed: " + (r.stderr || "").slice(0, 200);
  }
}

F.write(args.out, args.quiet);
