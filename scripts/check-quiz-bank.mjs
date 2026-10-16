import fs from "node:fs";
import path from "node:path";

// Validates the SERVER-ONLY quiz-bank content (src/content/quiz-bank/<track>/…)
// that backs the lesson-quiz + final-exam system. Distinct from check-quizzes.mjs,
// which validates the older per-track src/content/quizzes/<track>.json files.

const BANK_DIR = path.join(process.cwd(), "content", "ar", "quiz-bank");
const TRACKS_DIR = path.join(process.cwd(), "content", "ar", "tracks");

let issues = 0;

function validateQuestions(file, questions, { minCount = 1 } = {}) {
  if (!Array.isArray(questions) || questions.length < minCount) {
    console.log(`${file}: expected at least ${minCount} question(s), found ${Array.isArray(questions) ? questions.length : "none"}`);
    issues++;
    return;
  }
  const seenIds = new Set();
  for (const q of questions) {
    const loc = `${file}#${q?.id ?? "?"}`;
    if (!q.id || typeof q.id !== "string") {
      console.log(`${loc}: missing/invalid id`);
      issues++;
      continue;
    }
    if (seenIds.has(q.id)) {
      console.log(`${loc}: duplicate id within file`);
      issues++;
    }
    seenIds.add(q.id);

    if (!q.q || typeof q.q !== "string") {
      console.log(`${loc}: missing question text`);
      issues++;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      console.log(`${loc}: expected exactly 4 options, found ${Array.isArray(q.options) ? q.options.length : "none"}`);
      issues++;
    } else {
      const uniqueOptions = new Set(q.options.map((o) => String(o).trim()));
      if (uniqueOptions.size !== q.options.length) {
        console.log(`${loc}: duplicate option text`);
        issues++;
      }
    }
    if (typeof q.answer !== "number" || !Number.isInteger(q.answer)) {
      console.log(`${loc}: answer is not an integer`);
      issues++;
    } else if (Array.isArray(q.options) && (q.answer < 0 || q.answer >= q.options.length)) {
      console.log(`${loc}: answer index ${q.answer} out of bounds`);
      issues++;
    }
    if (!q.explain || typeof q.explain !== "string") {
      console.log(`${loc}: missing explain`);
      issues++;
    }
  }
}

if (fs.existsSync(BANK_DIR)) {
  for (const track of fs.readdirSync(BANK_DIR)) {
    const trackDir = path.join(BANK_DIR, track);
    if (!fs.statSync(trackDir).isDirectory()) continue;

    // Exam bank
    const examFile = path.join(trackDir, "exam.json");
    if (fs.existsSync(examFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(examFile, "utf8"));
        validateQuestions(`${track}/exam.json`, data.questions, { minCount: 80 });
      } catch (e) {
        console.log(`${track}/exam.json: JSON parse error — ${e.message}`);
        issues++;
      }
    }

    // Lesson pools
    const lessonsDir = path.join(trackDir, "lessons");
    if (fs.existsSync(lessonsDir)) {
      const trackLessonSlugs = fs.existsSync(path.join(TRACKS_DIR, track))
        ? new Set(
            fs
              .readdirSync(path.join(TRACKS_DIR, track))
              .filter((f) => f.endsWith(".mdx"))
              .map((f) => f.replace(/\.mdx$/, ""))
          )
        : null;

      for (const f of fs.readdirSync(lessonsDir)) {
        if (!f.endsWith(".json")) continue;
        const slug = f.replace(/\.json$/, "");
        const rel = `${track}/lessons/${f}`;

        if (trackLessonSlugs && !trackLessonSlugs.has(slug)) {
          console.log(`${rel}: no matching lesson file src/content/tracks/${track}/${slug}.mdx (orphaned bank file?)`);
          issues++;
        }

        try {
          const data = JSON.parse(fs.readFileSync(path.join(lessonsDir, f), "utf8"));
          validateQuestions(rel, data.questions, { minCount: 5 });
          for (const q of data.questions ?? []) {
            if (q.id && !q.id.startsWith(`${slug}-`)) {
              console.log(`${rel}#${q.id}: id doesn't start with "${slug}-"`);
              issues++;
            }
          }
        } catch (e) {
          console.log(`${rel}: JSON parse error — ${e.message}`);
          issues++;
        }
      }
    }
  }
}

console.log(`\nTotal quiz-bank issues: ${issues}`);
if (issues > 0) process.exit(1);
