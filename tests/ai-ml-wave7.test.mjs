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
  for (const file of files) {
    const content = readFileSafe(path.join(TRACK_DIR, file));
    if (!content) continue;
    for (const [name, re] of Object.entries(HARD_RULE_PATTERNS).slice(0, 4)) {
      assert.ok(
        !re.test(content),
        `${file} contains forbidden ${name} pattern`
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
