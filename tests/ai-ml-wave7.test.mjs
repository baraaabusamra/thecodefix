import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Structural guarantees for AI/ML Wave 7 (RAG + Vector Databases + AI Agents).
//
// Wave 7 adds 15 lessons (orders 120-134), 3 projects (orders 206-208),
// and 3 blog posts. The intent of these tests is to fail fast if any of
// the following regresses:
//
//   - all expected Wave 7 lesson files exist at the agreed paths
//   - lesson orders 120..134 are unique and exact
//   - project orders 206, 207, 208 exist
//   - expected blog posts exist
//   - frontmatter is valid (title, description, order)
//   - internal links resolve (smoke-check the obvious next/prev links)
//   - retrieval lessons link back to lesson 82 (foundations)
//   - lesson 120 (RAG overview) links to Wave 6 foundation
//   - project 206 contains no LLM generation dependency
//   - project 207 includes retrieval + generation + sources
//   - agent loop lessons (130-134) teach max-turn / stop-condition concepts
//   - project 208 has a max-turn limit
//   - project 208 contains no `eval(`, `exec(`, `compile(`, shell, subprocess
//   - no hardcoded API keys in runnable examples
//   - no universal chunk-size / similarity-threshold / top-k recommendations
//   - no claim that RAG eliminates hallucination
//   - AI/ML secure final-exam scope (Waves 1-5) remains untouched
//   - AI/ML reference section is not expanded by Wave 7 (still 30 entries)
//   - no Wave 8 lesson files accidentally created
//   - Phase 2 untouched
//
// This is the per-wave structural guarantee.

const TRACK_DIR = path.join(
  process.cwd(),
  "src",
  "content",
  "tracks",
  "ai-ml"
);

const BLOG_DIR = path.join(
  process.cwd(),
  "src",
  "content",
  "blog"
);

const META_PATH = path.join(TRACK_DIR, "_meta.json");

const REFERENCE_JSON_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "reference",
  "ai-ml.json"
);

const EXAM_JSON_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "quiz-bank",
  "ai-ml",
  "exam.json"
);

// -----------------------------------------------------------------------------
// Expected Wave 7 lesson slugs and orders (120..134)
// -----------------------------------------------------------------------------

const EXPECTED_LESSONS = [
  { slug: "120-rag-overview", order: 120 },
  { slug: "121-retrieval-embeddings", order: 121 },
  { slug: "122-document-chunking", order: 122 },
  { slug: "123-semantic-search", order: 123 },
  { slug: "124-vector-databases", order: 124 },
  { slug: "125-pgvector-vector-search", order: 125 },
  { slug: "126-rag-pipeline", order: 126 },
  { slug: "127-grounding-and-citations", order: 127 },
  { slug: "128-hybrid-search-and-reranking", order: 128 },
  { slug: "129-rag-failure-modes", order: 129 },
  { slug: "130-agent-fundamentals", order: 130 },
  { slug: "131-agent-loop", order: 131 },
  { slug: "132-agent-state-and-memory", order: 132 },
  { slug: "133-workflows-vs-agents", order: 133 },
  { slug: "134-agent-orchestration-and-handoffs", order: 134 },
];

const EXPECTED_PROJECTS = [
  { slug: "206-project-semantic-search", order: 206 },
  { slug: "207-project-rag-knowledge-assistant", order: 207 },
  { slug: "208-project-agent-study-assistant", order: 208 },
];

const EXPECTED_BLOG_POSTS = [
  "what-is-rag.mdx",
  "vector-database-explained.mdx",
  "ai-agents-vs-workflows.mdx",
];

// Topics that belong to Wave 8 only — must NOT appear in Wave 7 content.
const FORBIDDEN_WAVE8_TOKENS = [
  "red-team",
  "red-teamin",
  "jailbreak",
  "jailbreaks",
  "prompt-injection-defense",
  "prompt-injection-defence",
  "owasp-llm",
  "responsible-ai-deep",
  "adversarial-retrieval",
  "poisoned-knowledge",
  "rag-benchmark",
];

// Hard prohibition patterns — must NOT appear in Wave 7 lesson/project body.
const HARD_RULE_PATTERNS = {
  eval: /\beval\s*\(/,
  exec: /\bexec\s*\(/,
  compile: /\bcompile\s*\(/,
  shell: /\bos\.system\s*\(|subprocess\b/,
  hardcodedKey: /sk-[A-Za-z0-9_-]{20,}/,
  universalChunk500: /\b500[\s-]*(?:token|tokens|كلمة|كلمات|word|words)\b[^.\n]{0,40}(?:best|optimal|always)/i,
  universalCosineThreshold:
    /cosine[^.\n]{0,40}(?:>|>=|greater than)[^.\n]{0,30}0\.\d+[^.\n]{0,40}(?:means?|relevant|relevant|هام|دالّة)/i,
  ragEliminatesHallucination:
    /(?:RAG|rag|الـRAG)\s+(?:يلغي|يقضي على|يحلّ مشكلة|eliminates|removes|solves|prevents)\s+(?:الهلوسة|hallucinations?|الأخطاء)/i,
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function frontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Meta description must mention Wave 7 themes
// -----------------------------------------------------------------------------

test("ai-ml _meta.json description mentions RAG, vector databases, and agents", () => {
  const content = readFileSafe(META_PATH);
  assert.ok(content, "ai-ml _meta.json missing");
  const json = JSON.parse(content);
  const desc = json.description || "";
  assert.ok(/RAG/.test(desc), "ai-ml meta description must mention RAG");
  assert.ok(
    /Vector|VECTOR|vector/i.test(desc) || /متجه/.test(desc),
    "ai-ml meta description must mention vector databases"
  );
  assert.ok(
    /Agent/i.test(desc) || /وكيل|وكلاء/.test(desc),
    "ai-ml meta description must mention AI agents"
  );
});

// -----------------------------------------------------------------------------
// Lesson existence + order + frontmatter
// -----------------------------------------------------------------------------

test("Wave 7 lesson files exist and have the agreed orders 120..134", () => {
  for (const { slug, order } of EXPECTED_LESSONS) {
    const filePath = path.join(TRACK_DIR, `${slug}.mdx`);
    const content = readFileSafe(filePath);
    assert.ok(content, `Wave 7 lesson file missing: ${slug}.mdx`);
    const fm = frontmatter(content);
    assert.ok(fm, `${slug} must have frontmatter`);
    assert.strictEqual(
      Number(fm.order),
      order,
      `${slug} frontmatter order must equal ${order}, got ${fm.order}`
    );
    assert.ok(fm.title, `${slug} must have a title in frontmatter`);
    assert.ok(
      fm.description,
      `${slug} must have a description in frontmatter`
    );
  }
});

test("Wave 7 lesson orders are unique", () => {
  const seen = new Set();
  for (const { slug, order } of EXPECTED_LESSONS) {
    assert.ok(!seen.has(order), `duplicate Wave 7 order ${order} (${slug})`);
    seen.add(order);
  }
});

test("Wave 7 lesson orders do not collide with Wave 6 lessons (orders 100-112) or projects (200-205)", () => {
  const wave7 = new Set(EXPECTED_LESSONS.map((l) => l.order));
  for (let o = 100; o <= 112; o++) {
    assert.ok(!wave7.has(o), `Wave 7 order ${o} collides with Wave 6 lesson`);
  }
  for (const o of [200, 201, 202, 203, 204, 205]) {
    assert.ok(
      !wave7.has(o),
      `Wave 7 order ${o} collides with Wave 1-6 project`
    );
  }
});

test("Wave 7 project files exist at orders 206, 207, 208", () => {
  for (const { slug, order } of EXPECTED_PROJECTS) {
    const filePath = path.join(TRACK_DIR, `${slug}.mdx`);
    const content = readFileSafe(filePath);
    assert.ok(content, `Wave 7 project file missing: ${slug}.mdx`);
    const fm = frontmatter(content);
    assert.ok(fm, `${slug} must have frontmatter`);
    assert.strictEqual(
      Number(fm.order),
      order,
      `${slug} frontmatter order must equal ${order}, got ${fm.order}`
    );
    assert.ok(fm.title, `${slug} must have a title in frontmatter`);
    assert.ok(
      fm.description,
      `${slug} must have a description in frontmatter`
    );
  }
});

test("Wave 7 blog posts exist", () => {
  for (const slug of EXPECTED_BLOG_POSTS) {
    const filePath = path.join(BLOG_DIR, slug);
    const content = readFileSafe(filePath);
    assert.ok(content, `Wave 7 blog post missing: ${slug}`);
    const fm = frontmatter(content);
    assert.ok(fm, `${slug} must have frontmatter`);
    assert.ok(fm.title, `${slug} must have a title`);
    assert.ok(fm.description, `${slug} must have a description`);
  }
});

// -----------------------------------------------------------------------------
// Internal cross-linking (smoke-check, not exhaustive)
// -----------------------------------------------------------------------------

test("lesson 120 (RAG overview) links back to lesson 82 (embeddings foundations) or 111 (tool calling)", () => {
  const filePath = path.join(TRACK_DIR, "120-rag-overview.mdx");
  const content = readFileSafe(filePath);
  assert.ok(content, "lesson 120 missing");
  assert.ok(
    /\/learn\/ai-ml\/82-nlp-embeddings/.test(content) ||
      /\/learn\/ai-ml\/111-function-tool-calling/.test(content) ||
      /\/learn\/ai-ml\/112-llm-api-engineering/.test(content),
    "lesson 120 should link back to embeddings (82) or Wave 6 foundations (111/112)"
  );
});

test("retrieval lessons (121-123) link to lesson 82 (embeddings foundations)", () => {
  for (const slug of [
    "121-retrieval-embeddings",
    "122-document-chunking",
    "123-semantic-search",
  ]) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /\/learn\/ai-ml\/82-nlp-embeddings/.test(content),
      `${slug} should link back to /learn/ai-ml/82-nlp-embeddings`
    );
  }
});

test("agent lessons (130-134) link back to Wave 6 tool calling (111)", () => {
  for (const slug of [
    "130-agent-fundamentals",
    "131-agent-loop",
    "132-agent-state-and-memory",
    "133-workflows-vs-agents",
    "134-agent-orchestration-and-handoffs",
  ]) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /\/learn\/ai-ml\/111-function-tool-calling/.test(content),
      `${slug} should link back to /learn/ai-ml/111-function-tool-calling`
    );
  }
});

// -----------------------------------------------------------------------------
// Project shape
// -----------------------------------------------------------------------------

test("project 206 (semantic search) contains no LLM generation dependency", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "206-project-semantic-search.mdx")
  );
  assert.ok(content, "project 206 missing");
  // It is OK to embed a query → embedding → similarity → top-k.
  // It is NOT OK to call an LLM to generate an answer.
  assert.ok(
    !/\.responses\.(create|parse)\s*\(/.test(content) &&
      !/\bchat_completions?\s*\.create\s*\(/.test(content) &&
      !/client\.chat\.completions\.create\s*\(/.test(content),
    "project 206 must not call any LLM generation endpoint (semantic search only)"
  );
  assert.ok(
    /cos_sim|cosine|similarity|top[_-]?k/i.test(content),
    "project 206 must demonstrate retrieval similarity / top-k"
  );
});

test("project 207 (RAG) includes retrieval + generation + sources", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "207-project-rag-knowledge-assistant.mdx")
  );
  assert.ok(content, "project 207 missing");
  assert.ok(
    /cos_sim|cosine|similarity|top[_-]?k/i.test(content),
    "project 207 must include retrieval (similarity / top-k)"
  );
  assert.ok(
    /\.responses\.(create|parse)\s*\(|client\.chat\.completions\.create\s*\(/.test(
      content
    ),
    "project 207 must include LLM generation"
  );
  assert.ok(
    /source|citation|مرجع|مصدر/i.test(content),
    "project 207 must expose source metadata"
  );
  assert.ok(
    /pgvector|vector_cosine_ops|<=>|<->/.test(content),
    "project 207 must use pgvector for storage"
  );
});

test("agent lessons teach max-turn / stop-condition concepts", () => {
  for (const slug of [
    "130-agent-fundamentals",
    "131-agent-loop",
    "132-agent-state-and-memory",
    "133-workflows-vs-agents",
    "134-agent-orchestration-and-handoffs",
  ]) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /max[_-]?turn|max_turns|maxTurns|max_iter|stop[_-]?condition|شرط\s+التوقّف|أقصى\s+عدد/i.test(
        content
      ),
      `${slug} should teach a max-turn / stop-condition concept`
    );
  }
});

test("project 208 (agent) has a max-turn limit", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  assert.ok(
    /max[_-]?turn|max_turns|maxTurns|max_iter/i.test(content),
    "project 208 must include a max-turn limit"
  );
});

// -----------------------------------------------------------------------------
// Hard prohibitions
// -----------------------------------------------------------------------------

test("Wave 7 lessons and projects contain no eval/exec/compile/shell", () => {
  const files = [
    ...EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`),
    ...EXPECTED_PROJECTS.map((p) => `${p.slug}.mdx`),
  ];
  // The negation-style prefix: lines that *describe* what's forbidden
  // (e.g. "لا eval", "forbidden: exec", "❌ compile", "do not use subprocess").
  // Teaching that these are unsafe is correct content; using them in code is not.
  const negationLineRe =
    /(?:لا\s|ممنوع|forbidden|do\s+not|don.?t\s+|❌|not\s+allowed|without|بدون|يُمنع|تجنّب|تجنّبها|never\s+use|not\s+in\s+code)/i;
  function offendingLines(content, re) {
    const out = [];
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = r.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineEnd = content.indexOf("\n", m.index);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (!negationLineRe.test(line)) out.push(line.trim());
    }
    return out;
  }
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    for (const [name, re] of Object.entries(HARD_RULE_PATTERNS).slice(0, 4)) {
      const offenders = offendingLines(content, re);
      assert.deepStrictEqual(
        offenders,
        [],
        `${file} contains forbidden ${name} pattern in executable code; offenders: ${offenders.join(" | ")}`
      );
    }
  }
});

test("Wave 7 runnable examples contain no hardcoded API keys", () => {
  const files = [
    ...EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`),
    ...EXPECTED_PROJECTS.map((p) => `${p.slug}.mdx`),
    ...EXPECTED_BLOG_POSTS,
  ];
  for (const file of files) {
    const p = path.join(file.endsWith(".mdx") && !file.includes("/") ? TRACK_DIR : BLOG_DIR, file);
    const content = readFileSafe(p);
    if (!content) continue;
    assert.ok(
      !HARD_RULE_PATTERNS.hardcodedKey.test(content),
      `${file} appears to contain a hardcoded API key (sk-...)`
    );
    // os.environ usage is recommended where an API key is needed, but many
    // Wave 7 lessons/projects are conceptual or run with local models only
    // (sentence-transformers, NumPy, pgvector). We do not force every file
    // to mention os.environ; the hardcodedKey check above is the actual
    // safety gate.
    if (
      /client\.openai|client\.anthropic|client\.[a-z_]*\.api_key|sk-[A-Za-z0-9_-]{20,}/i.test(
        content
      )
    ) {
      assert.ok(
        /os\.environ\b|getenv|process\.env/i.test(content),
        `${file} mentions a provider client/key but never reads it from environment`
      );
    }
  }
});

test("Wave 7 lessons do not recommend a universal chunk size or similarity threshold", () => {
  const files = EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`);
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    assert.ok(
      !HARD_RULE_PATTERNS.universalChunk500.test(content),
      `${file} must not recommend a single chunk size as universally best`
    );
    assert.ok(
      !HARD_RULE_PATTERNS.universalCosineThreshold.test(content),
      `${file} must not claim a single cosine threshold defines relevance`
    );
  }
});

test("Wave 7 lessons do not claim RAG eliminates hallucination", () => {
  const files = EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`);
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    assert.ok(
      !HARD_RULE_PATTERNS.ragEliminatesHallucination.test(content),
      `${file} must not claim RAG eliminates hallucination`
    );
  }
});

// -----------------------------------------------------------------------------
// Wave 8 boundary — must NOT appear in Wave 7 content
// -----------------------------------------------------------------------------

test("no Wave 8-only topic accidentally lands in Wave 7", () => {
  const files = [
    ...EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`),
    ...EXPECTED_PROJECTS.map((p) => `${p.slug}.mdx`),
    ...EXPECTED_BLOG_POSTS,
  ];
  for (const file of files) {
    const base = file.endsWith(".mdx") && !file.includes("/")
      ? TRACK_DIR
      : BLOG_DIR;
    const content = readFileSafe(path.join(base, file));
    if (!content) continue;
    for (const tok of FORBIDDEN_WAVE8_TOKENS) {
      assert.ok(
        !content.toLowerCase().includes(tok.toLowerCase()),
        `${file} contains forbidden Wave 8 token '${tok}'`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// Hard contracts: secure exam still Waves 1-5, reference still 30 entries
// -----------------------------------------------------------------------------

test("AI/ML secure exam bank remains untouched (no Wave 7 slugs)", () => {
  const content = readFileSafe(EXAM_JSON_PATH);
  assert.ok(content, `secure AI/ML exam file missing at ${EXAM_JSON_PATH}`);
  const wave7SlugTokens = [
    "rag-overview",
    "retrieval-embeddings",
    "document-chunking",
    "semantic-search",
    "vector-databases",
    "pgvector",
    "rag-pipeline",
    "grounding-and-citations",
    "hybrid-search",
    "rag-failure-modes",
    "agent-fundamentals",
    "agent-loop",
    "agent-state-and-memory",
    "workflows-vs-agents",
    "agent-orchestration",
  ];
  for (const tok of wave7SlugTokens) {
    assert.ok(
      !content.includes(tok),
      `secure AI/ML exam references Wave 7 token '${tok}' (out of scope)`
    );
  }
});

test("AI/ML reference remains exactly 30 entries (Wave 7 must not expand it)", () => {
  const content = readFileSafe(REFERENCE_JSON_PATH);
  assert.ok(content, "AI/ML reference JSON missing");
  const entries = JSON.parse(content);
  assert.ok(Array.isArray(entries), "AI/ML reference JSON should be an array");
  assert.strictEqual(
    entries.length,
    30,
    `AI/ML reference must remain at 30 entries (got ${entries.length})`
  );
});

// -----------------------------------------------------------------------------
// API accuracy regression tests (Wave 7 API accuracy pass)
//
// These tests pin the corrections from the API accuracy review so a future
// edit cannot silently regress them:
//   - Sentence Transformers retrieval API: encode_query / encode_document
//     ARE the current API (lesson 121 must not claim they are absent).
//   - multilingual-e5 retrieval uses literal "query:" / "passage:" prefixes
//     (NOT prompt_name="query"/"passage" as a kwarg).
//   - No hardcoded "gpt-4o-mini" / "gpt-4o" / "gpt-4.1" provider model IDs.
//   - Lesson 132 uses SQLiteSession, not bare Session().
//   - Lesson 134 uses Agent.as_tool() and does NOT claim handoffs auto-return.
//   - No "temperature = 0" determinism claim (control flow != model output).
//   - No fixed cost examples ($0.001, $0.005, "4 × gpt-4o-mini", etc.).
//   - Project 208 contains NO filesystem write calls (write_text, json.dump,
//     open(..., 'w'), .to_csv) and NO save_note side-effect tool.
//   - Project 208 uses SQLiteSession OR explicit to_input_list().
//   - Project 208 uses current guardrail API (GuardrailFunctionOutput +
//     @input_guardrail) and never uses the fake @InputGuardrail decorator.
//   - Project 208 contains no eval/exec/compile/os.system/subprocess calls.
//   - pgvector lesson does NOT present sqrt(N) as a universal rule for
//     IVFFlat lists and does NOT claim opclass mismatch produces wrong
//     distances (it just disables index usage -> sequential scan fallback).
// -----------------------------------------------------------------------------

test("lesson 121 acknowledges encode_query / encode_document as current API", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "121-retrieval-embeddings.mdx")
  );
  assert.ok(content, "lesson 121 missing");
  // The lesson must mention encode_query and encode_document as available
  // methods (not falsely claim they don't exist).
  assert.ok(
    /encode_query|encode_document/.test(content),
    "lesson 121 must acknowledge encode_query / encode_document as current Sentence Transformers API"
  );
});

test("retrieval lessons use encode_query / encode_document (no prompt_name= for multilingual-e5)", () => {
  const slugs = [
    "121-retrieval-embeddings",
    "123-semantic-search",
    "125-pgvector-vector-search",
  ];
  for (const slug of slugs) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /encode_query|encode_document|f"query:|f"passage:|"query:|"passage:/.test(
        content
      ),
      `${slug} must use encode_query/encode_document or literal query:/passage: prefixes for retrieval`
    );
    // Allow the pattern only on comment lines (# or //).
    const promptNameRe = /prompt_name\s*=\s*["'](?:query|passage)["']/g;
    const violations = [];
    let pm;
    while ((pm = promptNameRe.exec(content)) !== null) {
      // find the start of the line containing this match
      const lineStart = content.lastIndexOf("\n", pm.index) + 1;
      const lineEnd = content.indexOf("\n", pm.index);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (!/^\s*(?:#|\/\/)/.test(line)) {
        violations.push(line.trim());
      }
    }
    assert.strictEqual(
      violations.length,
      0,
      `${slug} must NOT use the legacy prompt_name= kwarg for multilingual-e5 outside comments; offenders: ${violations.join(" | ")}`
    );
  }
});

test("projects 206 and 207 use encode_query / encode_document or query:/passage: prefixes", () => {
  for (const slug of [
    "206-project-semantic-search",
    "207-project-rag-knowledge-assistant",
  ]) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /encode_query|encode_document|f"query:|f"passage:|"query:|"passage:/.test(
        content
      ),
      `${slug} must use encode_query/encode_document or literal query:/passage: prefixes`
    );
    assert.ok(
      !/prompt_name\s*=\s*["'](?:query|passage)["']/.test(content),
      `${slug} must NOT use prompt_name= kwarg for multilingual-e5`
    );
  }
});

test("Wave 7 lessons and projects contain no hardcoded provider model IDs", () => {
  // provider/model is configuration, not curriculum content.
  // Allow when wrapped in os.environ["..."] or in a setup comment.
  const HARDCODED_MODEL =
    /["'](?:gpt-4o-mini|gpt-4o|gpt-4\.1|gpt-4-turbo|claude-3-5-sonnet|claude-3-opus)["']/;
  const files = [
    ...EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`),
    ...EXPECTED_PROJECTS.map((p) => `${p.slug}.mdx`),
  ];
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    const matches =
      content.match(new RegExp(HARDCODED_MODEL.source, "g")) || [];
    for (const m of matches) {
      const idx = content.indexOf(m);
      const window = content.slice(
        Math.max(0, idx - 80),
        idx + m.length + 80
      );
      const isEnvLookup =
        /os\.environ\s*\[\s*["'][^"']*MODEL["']\s*\]/.test(window);
      const isSetupComment =
        /مثلاً|example|setup|comment|يكون/i.test(window);
      assert.ok(
        isEnvLookup || isSetupComment,
        `${file} hardcodes model ID ${m} outside an os.environ lookup or setup comment`
      );
    }
  }
});

test("lesson 132 uses SQLiteSession (not bare Session())", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "132-agent-state-and-memory.mdx")
  );
  assert.ok(content, "lesson 132 missing");
  assert.ok(
    /SQLiteSession/.test(content),
    "lesson 132 must demonstrate SQLiteSession (not a bare Session() instantiation)"
  );
  // The current OpenAI Agents SDK exposes SQLiteSession / SQLAlchemySession,
  // not a bare `Session()` constructor for direct instantiation.
  assert.ok(
    !/from\s+agents\s+import[^]*\bSession\b[^]*\bSession\s*\(\s*\)/m.test(content),
    "lesson 132 must NOT instantiate a bare `Session()` (use SQLiteSession)"
  );
});

test("lesson 134 uses Agent.as_tool() and explains handoffs do not auto-return", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "134-agent-orchestration-and-handoffs.mdx")
  );
  assert.ok(content, "lesson 134 missing");
  assert.ok(
    /as_tool\s*\(/.test(content),
    "lesson 134 must demonstrate the Agent.as_tool() supervisor pattern"
  );
  // Handoff semantics correction: control transfers to specialist and run
  // ends with specialist's final_output (does NOT auto-return to triage).
  assert.ok(
    /لا\s+["']?يرجع["']?|لا\s+يعود|control\s+لا|run\s+ينتهي|final_output\s+للـ\s+specialist/.test(
      content
    ),
    "lesson 134 must clarify that handoff does NOT auto-return control to the triage agent"
  );
});

test("Wave 7 lessons do not claim temperature=0 makes agents deterministic", () => {
  // Control flow != model output; temperature controls sampling only.
  const DETERMINISM_CLAIM =
    /temperature\s*=\s*0[^.\n]{0,80}(?:deterministic|ثابت|حتمي|مضمون)/i;
  const slugs = [
    "131-agent-loop",
    "132-agent-state-and-memory",
    "133-workflows-vs-agents",
    "134-agent-orchestration-and-handoffs",
  ];
  for (const slug of slugs) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      !DETERMINISM_CLAIM.test(content),
      `${slug} must not claim temperature=0 alone makes agent output deterministic`
    );
  }
});

test("Wave 7 lessons do not hardcode fixed cost examples", () => {
  // Pricing changes; curriculum should use symbolic formulas.
  const FIXED_COST =
    /\$\s*0\.\d{3,}|0\.\d{3,}\s*\$|gpt-4o-mini.*\$\$|\d+\s*×\s*gpt-4o-mini/;
  const files = [
    ...EXPECTED_LESSONS.map((l) => `${l.slug}.mdx`),
    ...EXPECTED_PROJECTS.map((p) => `${p.slug}.mdx`),
  ];
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    assert.ok(
      !FIXED_COST.test(content),
      `${file} must not hardcode a fixed cost example; use a symbolic formula (N × tokens × provider-price)`
    );
  }
});

test("project 208 contains NO filesystem writes from any tool", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // Allow patterns only in prose/comments (Markdown list items, blockquotes,
  // comments), not in Python code blocks.
  function lineOffenders(re, text) {
    const out = [];
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = r.exec(text)) !== null) {
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      const lineEnd = text.indexOf("\n", m.index);
      const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (/^\s*(?:#|\/\/|>\s|\-\s|\*\s|□)/.test(line)) continue; // markdown/comment
      out.push(line.trim());
    }
    return out;
  }
  const writeTextOff = lineOffenders(/\.write_text\s*\(/, content);
  assert.deepStrictEqual(
    writeTextOff,
    [],
    `project 208 must not call Path.write_text outside prose; offenders: ${writeTextOff.join(" | ")}`
  );
  const openOff = lineOffenders(/open\s*\([^)]*["']w["']/, content);
  assert.deepStrictEqual(
    openOff,
    [],
    `project 208 must not call open(..., 'w') outside prose; offenders: ${openOff.join(" | ")}`
  );
  assert.ok(
    !/SESSIONS_PATH|scratchpad\.json/.test(content),
    "project 208 must not write sessions / scratchpad JSON to disk"
  );
});

test("project 208 does not define or use a save_note side-effect tool", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  assert.ok(
    !/def\s+save_note\b/.test(content) &&
      !/@function_tool[\s\S]{0,200}def\s+save_note/.test(content),
    "project 208 must not define a save_note side-effect tool"
  );
});

test("project 208 exposes safe read-only study tools", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  assert.ok(
    /def\s+get_course_info\b/.test(content),
    "project 208 should expose get_course_info"
  );
  assert.ok(
    /def\s+calculate_study_schedule\b/.test(content),
    "project 208 should expose calculate_study_schedule"
  );
  assert.ok(
    /def\s+search_course_notes\b/.test(content),
    "project 208 should expose search_course_notes"
  );
});

test("project 208 uses SQLiteSession or explicit to_input_list()", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  assert.ok(
    /SQLiteSession\b/.test(content) || /to_input_list\s*\(/.test(content),
    "project 208 must use SQLiteSession or to_input_list() for multi-turn memory"
  );
});

test("project 208 uses current guardrail API (no fake @InputGuardrail)", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // Allow @InputGuardrail only in prose explaining the wrong API.
  const offenders = [];
  const re = /@InputGuardrail\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/^\s*(?:#|\/\/|>\s|\-\s|\*\s|□)/.test(line)) continue;
    offenders.push(line.trim());
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `project 208 must not use @InputGuardrail in code; offenders: ${offenders.join(" | ")}`
  );
  assert.ok(
    /GuardrailFunctionOutput\b/.test(content) &&
      /@input_guardrail\b/.test(content),
    "project 208 must use GuardrailFunctionOutput + @input_guardrail (current API)"
  );
});

test("project 208 contains no eval/exec/compile/os.system/subprocess calls in tool code", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // Allow negation-style prose lines (lessons correctly list forbidden tools).
  const negationLineRe =
    /(?:لا\s|ممنوع|forbidden|do\s+not|don.?t\s+|❌|not\s+allowed|without|بدون|يُمنع|تجنّب|never\s+use|not\s+in\s+code)/i;
  function offendingLines(re) {
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const out = [];
    let m;
    while ((m = r.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineEnd = content.indexOf("\n", m.index);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (!negationLineRe.test(line)) out.push(line.trim());
    }
    return out;
  }
  for (const [name, re] of Object.entries(HARD_RULE_PATTERNS).slice(0, 4)) {
    const offenders = offendingLines(re);
    assert.deepStrictEqual(
      offenders,
      [],
      `project 208 contains forbidden ${name} pattern in executable code; offenders: ${offenders.join(" | ")}`
    );
  }
});

test("lesson 125 (pgvector) does not present sqrt(N) as a universal rule and does not claim opclass mismatch produces wrong distances", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "125-pgvector-vector-search.mdx")
  );
  assert.ok(content, "lesson 125 missing");
  // The legacy mistake: "lists = sqrt(N) is the universal rule for IVFFlat".
  assert.ok(
    !/lists\s*=\s*sqrt\s*\(\s*N\s*\)/.test(content),
    "lesson 125 must not present sqrt(N) as a single-line universal rule"
  );
  // The legacy mistake: opclass mismatch produces wrong distances.
  // Allow the exact wording "mismatch does NOT mean wrong distance" (negated
  // statement) — the violation is a positive claim "mismatch → wrong".
  assert.ok(
    !/opclass\s+mismatch[^.\n]{0,80}(?:wrong|incorrect|خاطئ)/i.test(content),
    "lesson 125 must not positively claim opclass mismatch produces wrong distances"
  );
  assert.ok(
    !/التطابق[^.\n]{0,80}مسافة\s+خاطئ/.test(content) ||
      /لا\s+يعني\s+أن\s+pgvector\s+سيرجّع\s+مسافة\s+خاطئ/.test(content),
    "lesson 125 must not positively claim mismatch → wrong distance (negated statements are fine)"
  );
});

// -----------------------------------------------------------------------------
// Wave 7 final precision pass regressions
//
// These tests pin the correctness invariants added in the precision pass:
//   - encode_query / encode_document ARE the retrieval-specific APIs; but for
//     multilingual-e5 the literal "query:" / "passage:" prefixes MUST be added
//     by the caller (the model card requires them in the input text).
//   - Project 206 never uses allow_pickle=True.
//   - Lesson 131 has a runnable typed calculator and no fake hardcoded result.
//   - Lesson 132 describes SQLiteSession accurately (local/small/simple) and
//     does NOT teach personal-fact vector memory in the lesson body.
//   - Lesson 133 example uses read-only local tools, not fetch_url/save_note.
//   - Project 208 regex parser matches what it parses (no advertised comma).
//   - Project 208 frames the input guardrail as a policy/UX layer, not as
//     the safety boundary (which lives in the tool allowlist + typed args).
//   - pgvector lesson 125 has no invented numeric IVFFlat heuristic ranges.
// -----------------------------------------------------------------------------

test("retrieval lessons do not falsely claim encode_query/encode_document auto-inject E5 prefixes", () => {
  // multilingual-e5-small requires the literal "query: " / "passage: "
  // text prefixes per its model card. encode_query / encode_document are
  // the recommended retrieval-specific APIs, but they do NOT auto-inject
  // these prefixes for this model. Lessons that teach e5 must therefore
  // (a) show the explicit f"query: ..." / f"passage: ..." prefixes and
  // (b) not positively claim encode_query/encode_document add them
  //     automatically.
  const slugs = [
    "121-retrieval-embeddings",
    "206-project-semantic-search",
    "207-project-rag-knowledge-assistant",
  ];
  for (const slug of slugs) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    // (a) explicit prefixes are present somewhere
    assert.ok(
      /f"query:\s|f'query:\s|"query:\s|"query:\s|f"passage:\s|f'passage:\s|"passage:\s|"passage:\s/.test(
        content
      ),
      `${slug} must use explicit f"query: ..." / f"passage: ..." prefixes for multilingual-e5`
    );
    // (b) no positive claim that encode_query/encode_document auto-inject
    //     E5 prefixes. The claim word ("تلقائي", "automatically",
    //     "adds the prefix", etc.) must appear on the SAME line as the
    //     encode_* call — this avoids matching a function call whose
    //     later comment correctly denies auto-injection.
    //     The previous-line check covers cases like:
    //       # نضيفها نحن صراحةً هنا ولا نعتمد على
    //       # encode_query / encode_document لإضافتها تلقائيًا لهذا الطراز.
    const offenders = [];
    const autoAddRe =
      /(encode_query|encode_document)[^\n]{0,200}(?:تلقائي[اًا]*|تلقائ[ياًى]*|automatically|adds?\s+(?:the\s+)?(?:prefixes?|البادئة)|(?:يُضيف|يضيف|تضيف)\s+(?:البادئة|البادئات|prefixes?)|(?:يُطبّق|يطبّق)\s+البادئة|لإضافتها)/g;
    let m;
    while ((m = autoAddRe.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineEnd = content.indexOf("\n", m.index);
      const line = content.slice(
        lineStart,
        lineEnd === -1 ? undefined : lineEnd
      );
      // Build the 2-line window (current + previous line) to detect a
      // negation-style explanation that spans the comment above.
      const prevLineEnd = lineStart - 1; // position of \n before this line
      const prevLineStart =
        prevLineEnd >= 0
          ? content.lastIndexOf("\n", prevLineEnd - 1) + 1
          : 0;
      const window =
        (prevLineStart >= 0 ? content.slice(prevLineStart, lineStart) : "") +
        line;
      // Allow negation-style explanations on the same line OR on the
      // previous line (which is part of the same multi-line comment).
      if (
        /لا\s*ت(?:فترض|عتمد)|لا\s+يعتمد|ولا\s+نعتمد|not\s+assumed|do\s+not\s+assume|don.?t\s+assume|not\s+automatically|not\s+added|لا\s+تضيف|صراحة|نضيفها\s+نحن|ليس\s+تلقائيًا|وليس\s+تلقائيًا/i.test(
          window
        )
      ) {
        continue;
      }
      offenders.push(line.trim());
    }
    assert.deepStrictEqual(
      offenders,
      [],
      `${slug} must not positively claim encode_query/encode_document auto-inject E5 prefixes; offenders: ${offenders.join(
        " | "
      )}`
    );
  }
});

test("projects 206 and 207 actually call encode_query / encode_document (not generic encode for retrieval)", () => {
  // The earlier "uses encode_query / encode_document or query:/passage: prefixes"
  // test allows either explicit prefixes OR the methods. This stricter test
  // pins that the projects use the retrieval-specific API methods themselves.
  for (const slug of [
    "206-project-semantic-search",
    "207-project-rag-knowledge-assistant",
  ]) {
    const content = readFileSafe(path.join(TRACK_DIR, `${slug}.mdx`));
    assert.ok(content, `${slug} missing`);
    assert.ok(
      /model\.encode_document\s*\(/.test(content),
      `${slug} must call model.encode_document(...) at least once for retrieval ingest`
    );
    assert.ok(
      /model\.encode_query\s*\(/.test(content),
      `${slug} must call model.encode_query(...) at least once for retrieval query`
    );
  }
});

test("project 206 does not use allow_pickle=True when loading the npz index", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "206-project-semantic-search.mdx")
  );
  assert.ok(content, "project 206 missing");
  assert.ok(
    !/allow_pickle\s*=\s*True/.test(content),
    "project 206 must not load the npz index with allow_pickle=True (unnecessary; dtype=str is enough)"
  );
});

test("lesson 131 calculator uses typed Literal args (no return float(expr) placeholder)", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "131-agent-loop.mdx")
  );
  assert.ok(content, "lesson 131 missing");
  // The legacy placeholder was: a real parser plus a final `return float(expr)`
  // stub. We must NOT see that pattern in a runnable example.
  assert.ok(
    !/return\s+float\s*\(\s*expr\s*\)/.test(content) &&
      !/return\s+float\s*\(\s*expression\s*\)/.test(content),
    "lesson 131 must not contain the `return float(expr)` placeholder calculator"
  );
  // The replacement tool uses a Literal enum and explicit dispatch.
  assert.ok(
    /Literal\s*\[\s*["']add["']\s*,\s*["']subtract["']\s*,\s*["']multiply["']\s*,\s*["']divide["']\s*\]\s*\)/.test(
      content
    ) ||
      /Literal\s*\[\s*["']add["']\s*,\s*["']subtract["']\s*,\s*["']multiply["']\s*,\s*["']divide["']\s*\]/.test(
        content
      ),
    "lesson 131 must demonstrate a Literal-typed calculator tool"
  );
});

test("lesson 131 contains no fake hardcoded current-weather result", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "131-agent-loop.mdx")
  );
  assert.ok(content, "lesson 131 missing");
  // The legacy tool was `get_weather` returning `f"طقس {city}: 22°C, مشمس."`.
  // That is a fake live-API result — must not exist.
  assert.ok(
    !/def\s+get_weather\s*\(/.test(content),
    "lesson 131 must not define a get_weather tool that returns hardcoded fake data"
  );
  assert.ok(
    !/22\s*°?\s*C,\s*(?:مشمس|sunny|clear)/.test(content),
    "lesson 131 must not contain the legacy hardcoded 22°C sunny response"
  );
});

test("lesson 132 does not characterize SQLiteSession as production-ready", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "132-agent-state-and-memory.mdx")
  );
  assert.ok(content, "lesson 132 missing");
  // Anywhere the lesson pairs SQLiteSession with "production-ready" is the
  // mischaracterization. Use a window check rather than a single-line regex
  // to allow mentioning both terms in different paragraphs (e.g. "in production,
  // use X instead of SQLiteSession").
  const idx = content.search(/SQLiteSession/);
  if (idx >= 0) {
    const window = content.slice(
      Math.max(0, idx - 100),
      Math.min(content.length, idx + 400)
    );
    const hasProdReady = /production[-\s]?ready|production[-\s]?grade|ready\s+for\s+production/i.test(
      window
    );
    const clarifiesNotProduction =
      /مناسب\s*لّـ|local\s+development|simple\s+applications|lightweight|local[\s-]+dev|تطبيقات\s*بسيطة|تطوير\s*محلّـ/i.test(
        window
      );
    assert.ok(
      !hasProdReady || clarifiesNotProduction,
      "lesson 132 must not characterize SQLiteSession as production-ready without clarifying limits"
    );
  }
});

test("lesson 132 contains no remember_user_fact / recall_user_facts personal-memory example", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "132-agent-state-and-memory.mdx")
  );
  assert.ok(content, "lesson 132 missing");
  // The legacy example was `def remember_user_fact(...)` and
  // `def recall_user_facts(...)`. Must not be present anywhere as an example
  // (allow if mentioned by name in a "do not teach this" prose line).
  const offenders = [];
  const re = /\b(?:remember_user_fact|recall_user_facts)\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    // Skip comment-style and Arabic prose lines
    if (
      /^\s*(?:#|\/\/|>\s|\-\s|\*\s|□)/.test(line) ||
      /(?:لا\s*تخزن|do\s+not|don.?t|never|not\s+in\s+this|Wave\s+7|module\s+دراسي|مسؤولية)/i.test(
        line
      )
    ) {
      continue;
    }
    offenders.push(line.trim());
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `lesson 132 must not teach the remember_user_fact / recall_user_facts personal-memory pattern; offenders: ${offenders.join(" | ")}`
  );
});

test("lesson 133 agent example uses safe local read-only tools (no fetch_url / save_note)", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "133-workflows-vs-agents.mdx")
  );
  assert.ok(content, "lesson 133 missing");
  // The legacy example was `tools=[search_docs, fetch_url, save_note]`.
  // That includes web fetch and a write tool — out of Wave 7 safe scope.
  // Allow mentions in prose that explicitly say these are out of scope.
  const offenders = [];
  const re = /\bfetch_url\b|\bsave_note\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (
      /^[\s\w\.\,\:\-\[\]\(\)\'\"]*(?:search_docs|fetch_url|save_note)[\s\w\.\,\:\-\[\]\(\)\'\"]*$/.test(
        line.trim()
      )
    ) {
      // Inline tool list line — must have been replaced.
      offenders.push(line.trim());
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `lesson 133 must not put fetch_url / save_note inside an agent's tools=[...] list; offenders: ${offenders.join(" | ")}`
  );
  // The replacement should be local + read-only.
  assert.ok(
    /tools\s*=\s*\[\s*search_course_notes\s*,/.test(content) ||
      /tools\s*=\s*\[[\s\S]{0,200}search_course_notes[\s\S]{0,200}\]/.test(content),
    "lesson 133 must demonstrate search_course_notes (or similar read-only local tool) in the agent example"
  );
});

test("project 208 parser regex does not advertise comma support", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // The legacy allowed set was `[\d+\-*/().,\s]+`. After the precision pass
  // the comma must be gone (the parser does not handle commas).
  assert.ok(
    !/\[[^\]]*\\d[^\]]*\,/.test(content),
    "project 208 parser regex must not include comma in the allowed character set"
  );
  // Positive check: the ALLOWED_TOKENS_PATTERN constant must declare the
  // exact allowed character set: digits + 4 operators + parens + space.
  // The pattern is a raw string literal so the `^` is unescaped.
  assert.ok(
    /ALLOWED_TOKENS_PATTERN\s*=\s*r"\^\[\\d\+\\-\*\/\(\)\.\\s\]\+\$"/.test(
      content
    ),
    'project 208 ALLOWED_TOKENS_PATTERN must equal r"^[\\d+\\-*/().\\s]+$" (digits + 4 operators + parens + space only)'
  );
});

test("project 208 frames input guardrail as policy/UX layer, not the safety boundary", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // The lesson must explain that the real safety boundary lives in:
  //   - allowlisted read-only tools
  //   - typed arguments
  //   - validation in each tool
  //   - no eval/exec/subprocess/compile
  //   - no side effects
  // Allow varied wording as long as all these concepts appear once.
  const requiredConcepts = [
    /allowlisted|allowed\s+tools|allowlist/i,
    /typed\s+arguments?|typed\s+args?|type[\s-]+safe|typed\s+inputs?/i,
    /\beval\b|\bexec\b|\bsubprocess\b|no\s+dynamic\s+code|no\s+arbitrary\s+execution/i,
    /no\s+side[\s-]?effects?|read[\s-]+only/i,
  ];
  for (const re of requiredConcepts) {
    assert.ok(
      re.test(content),
      `project 208 safety-boundary explanation must mention: ${re}`
    );
  }
  // The framing line itself should distinguish the guardrail from the boundary.
  assert.ok(
    /policy|UX|تجربة\s+المستخدم|policy\s*\/\s*UX|policy\s+layer/i.test(content),
    "project 208 must frame the input guardrail as a policy/UX layer"
  );
});

test("project 208 input guardrail option run_in_parallel is mentioned or explicit False", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // Either the project documents the parallel default + uses run_in_parallel=False,
  // or it documents the parallel default and explains the trade-off.
  assert.ok(
    /run_in_parallel\s*=\s*False/.test(content) ||
      /run\s+in\s+parallel[\s\S]{0,200}(?:default|False|موازي|true|true\s+بشكل\s+افتراضي)/i.test(
        content
      ),
    "project 208 must document the run_in_parallel guardrail option"
  );
});

test("pgvector lesson contains no invented 1K→10..100 / 1M→1K..4K IVFFlat lists heuristic", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "125-pgvector-vector-search.mdx")
  );
  assert.ok(content, "lesson 125 missing");
  // The legacy wording invented specific numeric ranges. After the precision
  // pass lesson 125 should explicitly avoid those heuristics.
  assert.ok(
    !/(?:rows\s*≈\s*1K|1K\s*→|1K\s+rows|rows\s*=\s*1K)[\s\S]{0,40}10\s*\.\.\s*100/.test(
      content
    ),
    "lesson 125 must not present a 1K rows → 10..100 lists heuristic"
  );
  assert.ok(
    !/(?:rows\s*≈\s*1M|1M\s*→|1M\s+rows|rows\s*=\s*1M)[\s\S]{0,40}1K\s*\.\.\s*4K/.test(
      content
    ),
    "lesson 125 must not present a 1M rows → 1K..4K lists heuristic"
  );
});

test("pgvector lesson contains no prescriptive 40-100 ef_search tuning range", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "125-pgvector-vector-search.mdx")
  );
  assert.ok(content, "lesson 125 missing");
  // The legacy line was: "40-100 نطاق معقول للتجربة" near ef_search.
  // After the precision pass: no exact "40-100" or "40..100" near ef_search.
  const efIdx = content.search(/ef_search/);
  if (efIdx >= 0) {
    const window = content.slice(
      Math.max(0, efIdx - 100),
      Math.min(content.length, efIdx + 1000)
    );
    assert.ok(
      !/(40\s*-\s*100|40\s*\.\.\s*100|40\s*to\s*100|40\s*إلى\s*100)/.test(
        window
      ),
      "lesson 125 must not present 40-100 as a prescriptive ef_search tuning range"
    );
  }
});

// -----------------------------------------------------------------------------
// Wave 7 final PR blocker regressions
//
// These tests pin the corrections from the final PR blocker pass:
//   1. Project 207: no undefined _cite_chunk_id helper; sources carry an
//      explicit citation number; citations are range-validated; CLI maps
//      citation → source directly.
//   2. Lesson 131: input guardrail uses run_in_parallel=False (blocking).
//   3. Lesson 125: no absolute claim that opclass mismatch produces a
//      specific planner node (e.g. Sequential Scan); planner-dependent
//      wording only.
//   4. Project 208: SQLiteSession db_path is NOT labeled production;
//      production/distributed guidance points to shared backends.
//   5. Lesson 132: scratchpad uses an explicit temporary_notes list, not
//      an undefined `notes` reference; clearly labeled temporary
//      process-local state.
// -----------------------------------------------------------------------------

test("project 207 defines no _cite_chunk_id helper and CLI maps citation number to source directly", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "207-project-rag-knowledge-assistant.mdx")
  );
  assert.ok(content, "project 207 missing");
  // The undefined helper from the precision pass must not be referenced.
  assert.ok(
    !/_cite_chunk_id\b/.test(content),
    "project 207 must not reference the undefined _cite_chunk_id helper"
  );
  // The CLI must look up the source by its explicit `citation` field
  // (the source list is 1-indexed by enumerate).
  assert.ok(
    /s\["citation"\]\s*==\s*c/.test(content) ||
      /s\[['"]citation['"]\]\s*==\s*c/.test(content),
    "project 207 CLI must map citation number to source via the citation field"
  );
  // The lesson must distinguish citation number (position) from chunk_id.
  assert.ok(
    /citation[\s\S]{0,300}chunk_id|chunk_id[\s\S]{0,300}citation|رقم\s+citation[\s\S]{0,400}chunk_id/i.test(
      content
    ),
    "project 207 must explicitly distinguish citation number from chunk_id"
  );
});

test("project 207 sources carry an explicit 1-indexed citation number", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "207-project-rag-knowledge-assistant.mdx")
  );
  assert.ok(content, "project 207 missing");
  // The sources list-comprehension must include `citation: i` paired with
  // enumerate(retrieved, start=1).
  assert.ok(
    /enumerate\s*\(\s*retrieved\s*,\s*start\s*=\s*1\s*\)/.test(content) &&
      /"citation"\s*:\s*i/.test(content),
    "project 207 must assign explicit 1-indexed citation numbers to each source"
  );
});

test("project 207 range-validates model-produced citations before returning", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "207-project-rag-knowledge-assistant.mdx")
  );
  assert.ok(content, "project 207 missing");
  // The answer() function must filter model-produced citations to the
  // valid range [1, len(sources)] and return that filtered list.
  assert.ok(
    /1\s*<=\s*c\s*<=\s*len\s*\(\s*sources\s*\)/.test(content) ||
      /1\s*<=\s*c\s*<=\s*len\(sources\)/.test(content),
    "project 207 must range-validate citations against [1, len(sources)]"
  );
  // Returned citations must be the validated list, not the raw model output.
  assert.ok(
    /["']citations["']\s*:\s*valid_citations/.test(content),
    "project 207 must return the validated citations list (not parsed.citations verbatim)"
  );
});

test("lesson 131 input guardrail uses run_in_parallel=False (blocking mode)", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "131-agent-loop.mdx")
  );
  assert.ok(content, "lesson 131 missing");
  // The decorator call must explicitly set run_in_parallel=False.
  // Allow an optional trailing comma (the call may span multiple lines).
  assert.ok(
    /input_guardrail\s*\(\s*check_input\s*,\s*run_in_parallel\s*=\s*False\s*,?\s*\)/.test(
      content
    ),
    "lesson 131 must call input_guardrail(check_input, run_in_parallel=False)"
  );
  // The lesson must explain both modes (parallel default + blocking False).
  const explainBoth =
    /run_in_parallel\s*=\s*True[\s\S]{0,200}موازي|موازي[\s\S]{0,200}run_in_parallel\s*=\s*True/i.test(
      content
    );
  const explainFalse =
    /run_in_parallel\s*=\s*False[\s\S]{0,200}(?:blocking|يكتمل|قبل\s+(?:بدء|أن\s+يبدأ)|before\s+(?:any|the\s+agent))/i.test(
      content
    );
  assert.ok(
    explainBoth || explainFalse,
    "lesson 131 must explain both run_in_parallel=True (default) and run_in_parallel=False (blocking) modes"
  );
});

test("lesson 125 does not claim opclass mismatch produces a specific planner node", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "125-pgvector-vector-search.mdx")
  );
  assert.ok(content, "lesson 125 missing");
  // The legacy absolute claim: "mismatch → Sequential Scan" (or close
  // variants). The new wording must be planner-dependent and not promise
  // a specific node.
  const offenders = [];
  const re =
    /(?:opclass|mismatch|عدم\s+التطابق|التطابق)[\s\S]{0,200}(?:Sequential\s+Scan|sequential\s+scan|Seq\s+Scan)/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    offenders.push(m[0].replace(/\s+/g, " ").trim());
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `lesson 125 must not claim opclass mismatch produces a Sequential Scan; offenders: ${offenders.join(" | ")}`
  );
  // The lesson must include planner-dependent wording somewhere.
  assert.ok(
    /(?:planner|depending\s+on|بحسب|قد\s+يختار|قد\s+تكون|لا\s+يوجد\s+ضمان)/i.test(
      content
    ),
    "lesson 125 must use planner-dependent wording when describing the opclass-mismatch behavior"
  );
});

test("project 208 does not label SQLiteSession db_path as production", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "208-project-agent-study-assistant.mdx")
  );
  assert.ok(content, "project 208 missing");
  // The exact legacy label `(إنتاج)` / `(production)` must not appear
  // anywhere as a description of the SQLiteSession db_path variant.
  assert.ok(
    !/إنتاج/.test(content) ||
      !/SQLiteSession[\s\S]{0,200}إنتاتج/.test(content),
    "project 208 must not label SQLiteSession db_path variant with '(إنتاج)'"
  );
  assert.ok(
    !/SQLiteSession[\s\S]{0,200}\(production\)/i.test(content),
    "project 208 must not label SQLiteSession db_path variant with '(production)'"
  );
  // The lesson must mention distributed/production backend alternatives.
  assert.ok(
    /SQLAlchemySession|Redis[\s-]?backed|shared\s+persistence\s+backend|distributed|موزّع/.test(
      content
    ),
    "project 208 must mention shared / distributed persistence backends as the production alternative"
  );
});

test("lesson 132 scratchpad example defines temporary_notes explicitly (no undefined notes reference)", () => {
  const content = readFileSafe(
    path.join(TRACK_DIR, "132-agent-state-and-memory.mdx")
  );
  assert.ok(content, "lesson 132 missing");
  // The legacy broken pattern joined an undefined `notes` list. The
  // replacement must define `temporary_notes` explicitly.
  assert.ok(
    /temporary_notes\s*:\s*list\s*\[\s*str\s*\]\s*=\s*\[\s*\]/.test(content),
    "lesson 132 must define `temporary_notes: list[str] = []` explicitly"
  );
  // The joined-string call must reference temporary_notes, not `notes`.
  const joinRe = /"\s*\\?n\s*"\s*\.\s*join\s*\(\s*notes\s*\)/g;
  const legacyJoins = content.match(joinRe) || [];
  assert.strictEqual(
    legacyJoins.length,
    0,
    `lesson 132 must not have an undefined 'notes' reference; offenders: ${legacyJoins.join(" | ")}`
  );
  // The lesson must label the scratchpad as temporary process-local state.
  const labels = [
    /temporary\s+process[\s-]?local\s+application\s+state|process[\s-]?local\s+application\s+state|temporary\s+process[\s-]?local/i,
    /not\s+durable\s+memory|ليس\s+durable|ليست\s+ذاكرة\s+دائمة|تضيع\s+بانتهاء/i,
    /not\s+hidden\s+(?:chain[\s-]?of[\s-]?thought|model\s+reasoning)|ليس\s+chain[\s-]?of[\s-]?thought|ليس\s+hidden/i,
    /not\s+long[\s-]?term\s+memory|ليس\s+long[\s-]?term|لا\s+تحلّ\s+محلّ\s+session|ليس\s+durable/i,
  ];
  for (const re of labels) {
    assert.ok(
      re.test(content),
      `lesson 132 scratchpad must be labeled with: ${re}`
    );
  }
});

// -----------------------------------------------------------------------------
// Phase 2 untouched — Phase 2 worktree must still be on its own branch
// -----------------------------------------------------------------------------

test("Phase 2 branch refactor/phase-2-architecture is not the current branch", () => {
  const current = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
  assert.notStrictEqual(
    current,
    "refactor/phase-2-architecture",
    "Wave 7 worktree must not be on the Phase 2 branch"
  );
  assert.strictEqual(
    current,
    "content/ai-ml-wave-7",
    `Wave 7 worktree must be on content/ai-ml-wave-7 (got ${current})`
  );
});
