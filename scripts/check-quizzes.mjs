import fs from "node:fs";
import path from "node:path";

const quizDir = path.join(process.cwd(), "src", "content", "quizzes");
let issues = 0;

for (const f of fs.readdirSync(quizDir)) {
  if (!f.endsWith(".json")) continue;
  const data = JSON.parse(fs.readFileSync(path.join(quizDir, f), "utf8"));
  const questions = data.questions || [];

  questions.forEach((q, i) => {
    const loc = `${f}#${i}`;
    if (!q.q || !Array.isArray(q.options) || typeof q.answer !== "number" || !q.explain) {
      console.log(`${loc}: missing a required field (q/options/answer/explain)`);
      issues++;
      return;
    }
    if (q.options.length < 2) {
      console.log(`${loc}: only ${q.options.length} option(s)`);
      issues++;
    }
    if (q.answer < 0 || q.answer >= q.options.length) {
      console.log(`${loc}: answer index ${q.answer} is out of bounds for ${q.options.length} options -- "${q.q}"`);
      issues++;
    }
    const uniqueOptions = new Set(q.options.map((o) => o.trim()));
    if (uniqueOptions.size !== q.options.length) {
      console.log(`${loc}: duplicate option text -- "${q.q}"`);
      issues++;
    }
  });
}

console.log(`\nTotal quiz issues: ${issues}`);
if (issues > 0) process.exit(1);
