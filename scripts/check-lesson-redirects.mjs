// check:lesson-redirects — a published lesson URL never turns into a 404.
//
// Why: Search Console (2026-10-16) listed 31 live 404s, 30 of them lessons —
// "summary" lessons renumbered as their track grew (24-summary → 29-summary)
// and OOP lessons removed when the track changed — none with a redirect.
// Every one of those was a URL Google had already indexed.
//
// How:
//   src/content/published-lessons.json  every lesson URL ever published
//                                       (append-only; `npm run dates:generate`
//                                       adds new lessons to it)
//   src/content/lesson-moves.json       { from, to } pairs → 301s in next.config.ts
//
// Fails when:
//   1. a lesson exists but isn't recorded as published (run dates:generate);
//   2. a recorded lesson no longer exists and no redirect covers it
//      (add { from, to } to lesson-moves.json);
//   3. a move points at a lesson that doesn't exist, or shadows a live lesson.
//
//   node scripts/check-lesson-redirects.mjs            check
//   node scripts/check-lesson-redirects.mjs --update   record current lessons

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TRACKS = path.join("src", "content", "tracks");
const LEDGER = path.join("src", "content", "published-lessons.json");
const MOVES = path.join("src", "content", "lesson-moves.json");

export function currentLessons() {
  const out = new Set();
  for (const tech of fs.readdirSync(TRACKS)) {
    const dir = path.join(TRACKS, tech);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".mdx")) out.add(`/learn/${tech}/${f.slice(0, -4)}`);
    }
  }
  return out;
}

export function recordPublished(lessons) {
  const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, "utf8")) : [];
  const all = [...new Set([...ledger, ...lessons])].sort();
  fs.writeFileSync(LEDGER, JSON.stringify(all, null, 2) + "\n");
  return all.length - ledger.length;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const lessons = currentLessons();

  if (process.argv.includes("--update")) {
    const added = recordPublished(lessons);
    console.log(`published-lessons.json: ${added} lesson(s) recorded`);
    process.exit(0);
  }

  const ledger = new Set(JSON.parse(fs.readFileSync(LEDGER, "utf8")));
  const moves = JSON.parse(fs.readFileSync(MOVES, "utf8")).moves;
  const config = fs.readFileSync("next.config.ts", "utf8");
  const redirected = new Set([
    ...moves.map((m) => m.from),
    ...[...config.matchAll(/source:\s*"(\/learn\/[^"]+)"/g)].map((m) => m[1]),
  ]);

  const errors = [];
  for (const url of lessons) {
    if (!ledger.has(url)) errors.push(`${url} is live but not recorded as published — run \`npm run dates:generate\` and commit src/content/published-lessons.json`);
  }
  for (const url of ledger) {
    if (!lessons.has(url) && !redirected.has(url)) {
      errors.push(`${url} was published and now 404s — add { "from": "${url}", "to": "<the lesson that replaces it>" } to src/content/lesson-moves.json`);
    }
  }
  for (const m of moves) {
    if (!lessons.has(m.to)) errors.push(`lesson-moves: ${m.from} → ${m.to}, but ${m.to} is not a lesson (no redirect chains, no dead targets)`);
    if (lessons.has(m.from)) errors.push(`lesson-moves: ${m.from} is still a live lesson — its redirect would hide it`);
  }

  if (errors.length) {
    console.error(`✗ check:lesson-redirects — ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`✓ check:lesson-redirects — ${lessons.size} live lessons, ${ledger.size} ever published, ${redirected.size} redirected`);
}
