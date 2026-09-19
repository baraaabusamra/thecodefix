import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Structural guarantees for AI/ML Wave 6 (Generative AI + LLM Engineering).
//
// Wave 6 adds 13 lessons (orders 100-112) and 2 projects (orders 204-205),
// plus 3 blog posts. The intent of these tests is to fail fast if any of the
// following regresses:
//
//   - expected lesson / project files exist at the agreed paths
//   - their frontmatter carries the expected `order` and required fields
//   - the lesson orders are unique and contiguous where they should be
//   - the project orders do not collide with lessons
//   - _meta.json description reflects the expanded scope
//   - 102-llms-how-they-work links back to lesson 68 (Transformer architecture)
//   - tool-calling lesson explicitly distinguishes itself from agents
//   - no Wave 7/8 topic accidentally lands in Wave 6
//   - no hardcoded API key patterns and no fixed provider prices are committed
//   - the secure AI/ML final-exam scope (Waves 1-5) is untouched
//   - the AI/ML reference section is not silently expanded by this wave
//
// This is the per-wave structural guarantee. Broader check:* scripts run in CI
// also exercise the same content, but per-wave tests give a clear failure pin.

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

// -----------------------------------------------------------------------------
// Expected Wave 6 lesson slugs and orders (100..112)
// -----------------------------------------------------------------------------

const EXPECTED_LESSONS = [
  { slug: "100-generative-ai-overview", order: 100 },
  { slug: "101-language-model-basics", order: 101 },
  { slug: "102-llms-how-they-work", order: 102 },
  { slug: "103-llm-training-and-alignment", order: 103 },
  { slug: "104-context-windows-and-tokens", order: 104 },
  { slug: "105-decoding-and-sampling", order: 105 },
  { slug: "106-prompting-basics", order: 106 },
  { slug: "107-prompt-patterns", order: 107 },
  { slug: "108-llm-api-basics", order: 108 },
  { slug: "109-conversation-state", order: 109 },
  { slug: "110-structured-outputs", order: 110 },
  { slug: "111-function-tool-calling", order: 111 },
  { slug: "112-llm-api-engineering", order: 112 },
];

// -----------------------------------------------------------------------------
// Expected Wave 6 projects (204, 205)
// -----------------------------------------------------------------------------

const EXPECTED_PROJECTS = [
  { slug: "204-project-structured-data-extractor", order: 204 },
  { slug: "205-project-tool-calling-app", order: 205 },
];

// -----------------------------------------------------------------------------
// Expected Wave 6 blog posts
// -----------------------------------------------------------------------------

const EXPECTED_BLOG_POSTS = [
  "how-do-llms-work.mdx",
  "prompt-engineering-for-beginners.mdx",
  "structured-output-vs-json-prompt.mdx",
];

// -----------------------------------------------------------------------------
// Topics explicitly OUT of scope for Wave 6 (Wave 7-8 subjects).
// Any of these slugs/names/tokens in Wave 6 lesson paths means scope creep.
// -----------------------------------------------------------------------------

const FORBIDDEN_WAVE_78_TOKENS = [
  "rag",
  "agent",
  "agents",
  "vector-database",
  "vector-store",
  "embeddings-for-retrieval",
  "mcp",
  "mlops",
  "fine-tuning",
  "fine-tuning-implementation",
  "red-team",
  "jailbreak",
  "prompt-injection-defense",
  "responsible-ai",
  "fairness",
  "production-monitoring",
  "evaluating-llm",
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

function readFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    fm[m[1]] = m[2].trim();
  }
  return fm;
}

// crude but effective: any line beginning `key:` where the value contains a
// secret-looking pattern. We only flag obvious cases.
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/, // OpenAI / sk-live style
  /sk-proj-[A-Za-z0-9]{20,}/,
];

function fileHasHardcodedSecret(content) {
  for (const re of SECRET_PATTERNS) {
    if (re.test(content)) return true;
  }
  return false;
}

// Crude price-anchoring detector: matches "$X.XX per 1k tokens" or similar
// hardcoded rates. We allow the formula cost ≈ input_tokens × rate but not
// a concrete number tied to a provider.
const PRICE_PATTERN = /\$\d+(?:\.\d+)?\s*(?:per|\/)\s*(?:1\s*[kK]|1,?\s*000)\s*tokens/i;

function fileHasFixedPrice(content) {
  return PRICE_PATTERN.test(content);
}

// -----------------------------------------------------------------------------
// Lesson file existence + frontmatter
// -----------------------------------------------------------------------------

for (const { slug, order } of EXPECTED_LESSONS) {
  const filePath = path.join(TRACK_DIR, `${slug}.mdx`);

  test(`lesson exists: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: src/content/tracks/ai-ml/${slug}.mdx`);
  });

  test(`lesson frontmatter parses: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: ${slug}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing or malformed in ${slug}`);
  });

  test(`lesson order is correct: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: ${slug}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing in ${slug}`);
    const declaredOrder = Number(fm.order);
    assert.ok(
      Number.isFinite(declaredOrder) && declaredOrder === order,
      `${slug} declared order ${fm.order} but expected ${order}`
    );
  });

  test(`lesson has title and description: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: ${slug}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing in ${slug}`);
    assert.ok(fm.title, `${slug} missing title`);
    assert.ok(fm.description, `${slug} missing description`);
  });

  test(`lesson contains no hardcoded secret: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: ${slug}`);
    assert.ok(
      !fileHasHardcodedSecret(content),
      `${slug} appears to contain a hardcoded API key`
    );
  });

  test(`lesson does not publish a fixed provider price: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `lesson file missing: ${slug}`);
    assert.ok(
      !fileHasFixedPrice(content),
      `${slug} appears to publish a fixed token price`
    );
  });
}

// -----------------------------------------------------------------------------
// Project file existence + frontmatter
// -----------------------------------------------------------------------------

for (const { slug, order } of EXPECTED_PROJECTS) {
  const filePath = path.join(TRACK_DIR, `${slug}.mdx`);

  test(`project exists: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(
      content,
      `project file missing: src/content/tracks/ai-ml/${slug}.mdx`
    );
  });

  test(`project frontmatter order matches: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `project file missing: ${slug}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing in ${slug}`);
    const declaredOrder = Number(fm.order);
    assert.ok(
      Number.isFinite(declaredOrder) && declaredOrder === order,
      `${slug} declared order ${fm.order} but expected ${order}`
    );
  });

  test(`project has title and description: ${slug}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `project file missing: ${slug}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing in ${slug}`);
    assert.ok(fm.title, `${slug} missing title`);
    assert.ok(fm.description, `${slug} missing description`);
  });
}

// -----------------------------------------------------------------------------
// Lesson order uniqueness
// -----------------------------------------------------------------------------

test("Wave 6 lesson orders are unique and contiguous 100..112", () => {
  const orders = EXPECTED_LESSONS.map((l) => l.order);
  const unique = new Set(orders);
  assert.strictEqual(unique.size, orders.length, "duplicate lesson orders");
  for (let i = 0; i < EXPECTED_LESSONS.length; i++) {
    assert.strictEqual(orders[i], 100 + i, `order gap or out of range at ${i}`);
  }
});

// -----------------------------------------------------------------------------
// Project order uniqueness and non-collision with lessons
// -----------------------------------------------------------------------------

test("Wave 6 project orders are unique", () => {
  const orders = EXPECTED_PROJECTS.map((p) => p.order);
  const unique = new Set(orders);
  assert.strictEqual(unique.size, orders.length, "duplicate project orders");
});

test("Wave 6 project orders do not collide with lesson orders", () => {
  const lessonOrders = new Set(EXPECTED_LESSONS.map((l) => l.order));
  for (const p of EXPECTED_PROJECTS) {
    assert.ok(
      !lessonOrders.has(p.order),
      `project order ${p.order} collides with a lesson order`
    );
  }
});

// -----------------------------------------------------------------------------
// Lesson 102 (LLMs how they work) links back to lesson 68 (Transformers)
// -----------------------------------------------------------------------------

test("lesson 102 links back to lesson 68 (Transformer architecture)", () => {
  const filePath = path.join(TRACK_DIR, "102-llms-how-they-work.mdx");
  const content = readFileSafe(filePath);
  assert.ok(content, "lesson 102 file missing");
  // Allow either explicit /learn/ai-ml/68-... link or a textual reference to
  // lesson 68 (Transformer).
  const hasLink = /\/learn\/ai-ml\/68-/.test(content);
  const hasTextual = /lesson\s*68|درس\s*68|Transformer/i.test(content);
  assert.ok(
    hasLink || hasTextual,
    "lesson 102 must reference lesson 68 (Transformer architecture)"
  );
});

// -----------------------------------------------------------------------------
// Lesson 111 (tool calling) explicitly distinguishes itself from agents
// -----------------------------------------------------------------------------

test("lesson 111 distinguishes tool calling from agents", () => {
  const filePath = path.join(TRACK_DIR, "111-function-tool-calling.mdx");
  const content = readFileSafe(filePath);
  assert.ok(content, "lesson 111 file missing");
  // The lesson must make the building-block vs agent distinction explicit.
  const hasBuildingBlockNote =
    /Tool calling is a building block/i.test(content) ||
    /لبنة/.test(content) ||
    /building block/i.test(content);
  const hasAgentForwardReference =
    /agents are covered later|Wave\s*7|الموجة\s*7|الموجة\s*التالية/i.test(
      content
    );
  assert.ok(
    hasBuildingBlockNote,
    "lesson 111 must include the 'tool calling is a building block' note"
  );
  assert.ok(
    hasAgentForwardReference,
    "lesson 111 must reference that agents are covered later (Wave 7)"
  );
});

// -----------------------------------------------------------------------------
// No Wave 7/8 topic accidentally landed in Wave 6
// -----------------------------------------------------------------------------

test("no Wave 7/8 topic slug landed in Wave 6 lesson filenames", () => {
  for (const { slug } of EXPECTED_LESSONS) {
    for (const token of FORBIDDEN_WAVE_78_TOKENS) {
      assert.ok(
        !slug.includes(token),
        `lesson slug ${slug} contains Wave 7/8 token '${token}'`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// _meta.json reflects expanded scope (Generative AI / LLMs / prompting / LLM
// application development)
// -----------------------------------------------------------------------------

test("ai-ml _meta.json mentions Generative AI / LLMs / prompting / LLM app development", () => {
  const content = readFileSafe(META_PATH);
  assert.ok(content, "ai-ml _meta.json missing");
  const meta = JSON.parse(content);
  const desc = (meta.description || "").toLowerCase();
  // We require at least three of the four expanded-scope signals to be present.
  const signals = [
    /generative\s*ai/i,
    /\bllms?\b/i,
    /prompt/i,
    /\bllm\b.*(app|application|engineering|hندسة)/i,
  ];
  let matches = 0;
  for (const re of signals) if (re.test(desc)) matches++;
  assert.ok(
    matches >= 3,
    `ai-ml _meta.json description should mention Generative AI / LLMs / prompting / LLM app dev (matched ${matches}/4). Description: ${meta.description}`
  );
});

// -----------------------------------------------------------------------------
// Blog posts exist with required frontmatter
// -----------------------------------------------------------------------------

for (const filename of EXPECTED_BLOG_POSTS) {
  const filePath = path.join(BLOG_DIR, filename);

  test(`blog post exists: ${filename}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(
      content,
      `blog post missing: src/content/blog/${filename}`
    );
  });

  test(`blog post has title and description: ${filename}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `blog post missing: ${filename}`);
    const fm = readFrontmatter(content);
    assert.ok(fm, `frontmatter missing in ${filename}`);
    assert.ok(fm.title, `${filename} missing title`);
    assert.ok(fm.description, `${filename} missing description`);
  });

  test(`blog post contains no hardcoded secret: ${filename}`, () => {
    const content = readFileSafe(filePath);
    assert.ok(content, `blog post missing: ${filename}`);
    assert.ok(
      !fileHasHardcodedSecret(content),
      `${filename} appears to contain a hardcoded API key`
    );
  });
}

// -----------------------------------------------------------------------------
// AI/ML Reference section is NOT expanded by Wave 6
// -----------------------------------------------------------------------------

test("AI/ML reference entry count is not expanded by Wave 6", () => {
  const content = readFileSafe(REFERENCE_JSON_PATH);
  assert.ok(content, "AI/ML reference JSON missing");
  const entries = JSON.parse(content);
  assert.ok(Array.isArray(entries), "AI/ML reference JSON should be an array");
  // PR #127 set the count to 30; Wave 6 must not add more entries (out of scope
  // per the task spec: "Do NOT expand AI/ML Reference yet").
  assert.strictEqual(
    entries.length,
    30,
    `AI/ML reference must remain at 30 entries (got ${entries.length})`
  );
});

// -----------------------------------------------------------------------------
// Secure AI/ML Final Exam scope is untouched
// -----------------------------------------------------------------------------
//
// The Wave 1-5 secure exam intentionally assesses only those waves. We do not
// add Wave 6 lessons to the exam bank. This test fails if a Wave 6 slug
// appears in the exam bank file.

test("AI/ML secure exam bank does not include Wave 6 slugs", () => {
  // The AI/ML secure exam lives under src/content/quiz-bank/ai-ml/exam.json.
  // Wave 1-5 lessons are in scope; Wave 6 must not appear in the question
  // pool because the final exam intentionally assesses Waves 1-5 only.
  const examPath = path.join(
    process.cwd(),
    "src",
    "content",
    "quiz-bank",
    "ai-ml",
    "exam.json"
  );
  const content = readFileSafe(examPath);
  assert.ok(content, `secure AI/ML exam file missing at ${examPath}`);

  // Each Wave 6 lesson slug is unique enough to be searched for as a substring.
  // We use a partial slug to avoid false positives on common words.
  const wave6SlugTokens = [
    "generative-ai-overview",
    "language-model-basics",
    "llms-how-they-work",
    "llm-training-and-alignment",
    "context-windows-and-tokens",
    "decoding-and-sampling",
    "prompting-basics",
    "prompt-patterns",
    "llm-api-basics",
    "conversation-state",
    "structured-outputs",
    "function-tool-calling",
    "llm-api-engineering",
  ];

  for (const tok of wave6SlugTokens) {
    assert.ok(
      !content.includes(tok),
      `secure AI/ML exam references Wave 6 token '${tok}' (out of scope)`
    );
  }
});
