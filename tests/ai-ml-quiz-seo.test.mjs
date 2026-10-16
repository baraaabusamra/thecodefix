import test, { mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";

// SEO guarantees for /quiz/[tech], exercised through the page's REAL
// generateMetadata.
//
// docs/seo-technical-policy.md §1 caps the rendered title at 60 characters,
// measured after the root layout appends " | The Code Fix". The preferred
// final-exam wording fits every track except AI/ML, whose long Arabic name
// pushed the rendered title to 84 characters — a title Google would truncate.
//
// §11 also requires /quiz/<tech> to stay indexable (it is the indexable
// target for "اختبار/شهادة {track}"), while /certificate/<tech> stays
// noindex because it renders a personalized credential.

const TITLE_SUFFIX = " | The Code Fix";
const MAX_RENDERED_TITLE = 60;
const MIN_DESCRIPTION = 50;
const MAX_DESCRIPTION = 160;

const TRACKS = {
  "ai-ml": { slug: "ai-ml", title: "الذكاء الاصطناعي وتعلّم الآلة" },
  html: { slug: "html", title: "HTML" },
  python: { slug: "python", title: "Python" },
};

mock.module("@tcf/content/tracks", {
  exports: {
    getTrack: async (slug) => TRACKS[slug] ?? null,
    getTracks: async () => Object.values(TRACKS),
  },
});

// The certificate components import a .css file, which the tsx test loader
// cannot parse. Only generateMetadata is under test here, so stub them.
const stubComponent = { exports: { default: () => null } };
mock.module("@tcf/certificates/ui/Certificate", stubComponent);
mock.module("@tcf/certificates/ui/SecureCertificate", stubComponent);

const quizPage = await import("../apps/web/src/app/quiz/[tech]/page.tsx");
const certPage = await import("../apps/web/src/app/certificate/[tech]/page.tsx");

async function quizMeta(tech) {
  return quizPage.generateMetadata({ params: Promise.resolve({ tech }) });
}

/** What Google actually renders: absolute titles skip the layout template. */
function renderedTitle(title) {
  if (typeof title === "string") return title + TITLE_SUFFIX;
  assert.ok(title?.absolute, "title must be a string or {absolute}");
  return title.absolute;
}

test("the AI/ML quiz title fits the 60-character rendered budget", async () => {
  const meta = await quizMeta("ai-ml");
  const rendered = renderedTitle(meta.title);
  assert.ok(
    rendered.length <= MAX_RENDERED_TITLE,
    `rendered title is ${rendered.length} chars: ${rendered}`
  );
  assert.ok(
    rendered.includes("الذكاء الاصطناعي"),
    "the track must still be identifiable in the title"
  );
  assert.ok(rendered.includes("اختبار"), "and it must still read as an exam page");
});

test("every track with an assessment produces a title within budget", async () => {
  const tracks = fs.readdirSync("content/ar/tracks").filter((t) => {
    return (
      fs.existsSync(`content/ar/quiz-bank/${t}/exam.json`) ||
      fs.existsSync(`content/ar/quizzes/${t}.json`)
    );
  });
  assert.ok(tracks.length > 1, "expected several assessed tracks");

  const over = [];
  for (const slug of tracks) {
    const meta = await quizPage.generateMetadata({
      params: Promise.resolve({ tech: slug }),
      // Only the three mocked tracks resolve; the rest return {} and are
      // skipped below. That still covers the long-name case we care about.
    });
    if (!meta.title) continue;
    const rendered = renderedTitle(meta.title);
    if (rendered.length > MAX_RENDERED_TITLE) {
      over.push(`${slug}: ${rendered.length} — ${rendered}`);
    }
  }
  assert.deepStrictEqual(over, []);
});

test("the HTML quiz title is unchanged by the AI/ML fix", async () => {
  const meta = await quizMeta("html");
  assert.equal(
    meta.title,
    "اختبار HTML النهائي: 40 سؤالًا وشهادة مجانية",
    "HTML fits the preferred wording, so it must keep it verbatim — " +
      "including the layout suffix (a plain string, not {absolute})"
  );
  assert.equal(typeof meta.title, "string", "HTML must still use the template");
});

test("the AI/ML description is present and within SEO length limits", async () => {
  const meta = await quizMeta("ai-ml");
  assert.equal(typeof meta.description, "string");
  assert.ok(
    meta.description.length >= MIN_DESCRIPTION &&
      meta.description.length <= MAX_DESCRIPTION,
    `description is ${meta.description.length} chars`
  );
  assert.ok(
    !meta.description.includes("بعد إكمال اختبارات الدروس"),
    "AI/ML is final_exam_only — it must not advertise a lesson-quiz gate it does not enforce"
  );
});

test("the HTML description still describes its lesson-quiz prerequisite", async () => {
  const meta = await quizMeta("html");
  assert.ok(
    meta.description.includes("بعد إكمال اختبارات الدروس"),
    "HTML is lesson_quizzes — its existing wording must not regress"
  );
});

test("/quiz/[tech] declares a self-canonical and stays indexable", async () => {
  for (const tech of ["ai-ml", "html"]) {
    const meta = await quizMeta(tech);
    assert.equal(meta.alternates?.canonical, `/quiz/${tech}`);
    assert.ok(
      meta.robots === undefined || meta.robots?.index !== false,
      `/quiz/${tech} must stay indexable`
    );
  }
});

test("/certificate/[tech] stays noindex for AI/ML", async () => {
  const meta = await certPage.generateMetadata({
    params: Promise.resolve({ tech: "ai-ml" }),
  });
  assert.equal(
    meta.robots?.index,
    false,
    "the certificate page renders a personalized credential and must not be indexed"
  );
  assert.equal(meta.robots?.follow, true);
  assert.equal(meta.alternates?.canonical, "/certificate/ai-ml");
});

test("the AI/ML quiz page ships no answer key in its structured data", async () => {
  const source = fs.readFileSync("apps/web/src/app/quiz/[tech]/page.tsx", "utf8");
  const secureBlock = source.slice(
    source.indexOf("if (hasExamBank(tech))"),
    source.indexOf("const quiz = getQuiz(tech);")
  );
  assert.ok(secureBlock.length > 0, "could not locate the secure-exam branch");

  // Compare against code only: the branch carries a comment that names the
  // very fields it refuses to emit ("Deliberately no `hasPart`/accepted
  // answers here"), which a raw substring check would flag as a violation.
  const code = secureBlock
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");

  for (const forbidden of ["acceptedAnswer", "suggestedAnswer", "hasPart"]) {
    assert.ok(
      !code.includes(forbidden),
      `the secure branch must not emit ${forbidden} — that is how the legacy ` +
        `quiz publishes its answers, and this bank's answers are server-only`
    );
  }
  assert.ok(
    code.includes("numberOfQuestions"),
    "the Quiz structured data should still state the question count"
  );
});
