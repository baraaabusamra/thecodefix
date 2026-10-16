import fs from "node:fs";
import path from "node:path";
import { contentDir } from "@tcf/content/paths";

// SERVER-ONLY question bank reader. Never import this file from a "use
// client" component or pass its return values as props to one — that would
// ship correct answers to the browser, exactly the mistake the legacy
// per-track quiz system (src/lib/quiz.ts) makes. Only server actions and
// server components that immediately strip answers before responding may
// import this module. See docs/html-quiz-security.md.

const BANK_DIR = contentDir("quiz-bank");

export type BankQuestion = {
  id: string; // stable, unique across the whole bank — used to snapshot attempts
  q: string;
  options: string[];
  answer: number; // index of the correct option — NEVER send this to the client pre-grading
  explain: string; // safe to reveal only after grading
};

export type SanitizedQuestion = {
  id: string;
  q: string;
  options: string[]; // pre-shuffled for this attempt
};

type Bank = { questions: BankQuestion[] };

function readBank(file: string): BankQuestion[] {
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as Bank;
  return data.questions ?? [];
}

export function getLessonQuestionPool(
  track: string,
  lessonSlug: string
): BankQuestion[] {
  return readBank(path.join(BANK_DIR, track, "lessons", `${lessonSlug}.json`));
}

export function getExamQuestionPool(track: string): BankQuestion[] {
  return readBank(path.join(BANK_DIR, track, "exam.json"));
}

export function hasLessonQuizBank(track: string, lessonSlug: string): boolean {
  return fs.existsSync(
    path.join(BANK_DIR, track, "lessons", `${lessonSlug}.json`)
  );
}

export function hasExamBank(track: string): boolean {
  return fs.existsSync(path.join(BANK_DIR, track, "exam.json"));
}

/**
 * Server-side assessment discovery: returns true when the track has ANY
 * kind of learner-facing assessment the user can take for a certificate —
 * either the legacy `src/content/quizzes/<track>.json` bank OR the secure
 * `src/content/quiz-bank/<track>/exam.json` server-graded bank.
 *
 * `hasQuiz()` alone misses secure-exam-only tracks (AI/ML), which would
 * hide `/quiz/ai-ml` from `generateStaticParams`, the sitemap, the
 * homepage track card, the account dashboard, and the lesson prev/next
 * navigation. Callers that previously used `hasQuiz()` for those purposes
 * should switch to `hasTrackAssessment()` so secure-exam-only tracks
 * appear correctly.
 *
 * Does NOT touch the answer key. Server-only.
 */
export function hasTrackAssessment(track: string): boolean {
  if (hasExamBank(track)) return true;
  // Cheap filesystem check, no need to import the legacy module.
  return fs.existsSync(
    path.join(contentDir("quizzes"), `${track}.json`)
  );
}

function getQuestionById(pool: BankQuestion[], id: string): BankQuestion | null {
  return pool.find((q) => q.id === id) ?? null;
}

/** Fisher-Yates, using crypto for real unpredictability (not Math.random). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks `count` random questions from `pool`, shuffles each question's
 * option order, and returns:
 *  - `questionIds`: the snapshot to persist (attempt-scoped, immutable)
 *  - `optionOrder`: per-question shuffled-index -> original-index map to persist
 *  - `sanitized`: what's safe to send to the client (no `answer`, no `explain`)
 */
export function pickAndSanitize(
  pool: BankQuestion[],
  count: number
): {
  questionIds: string[];
  optionOrder: Record<string, number[]>;
  sanitized: SanitizedQuestion[];
} {
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  const questionIds = picked.map((q) => q.id);
  const optionOrder: Record<string, number[]> = {};
  const sanitized: SanitizedQuestion[] = picked.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    optionOrder[q.id] = order;
    return {
      id: q.id,
      q: q.q,
      options: order.map((originalIndex) => q.options[originalIndex]),
    };
  });
  return { questionIds, optionOrder, sanitized };
}

/**
 * Re-derives the snapshot the client saw (question text/order, shuffled
 * options — no answers) from persisted `questionIds` + `optionOrder`, for
 * resuming an in-progress attempt without re-shuffling.
 */
export function reconstructSanitized(
  pool: BankQuestion[],
  questionIds: string[],
  optionOrder: Record<string, number[]>
): SanitizedQuestion[] {
  return questionIds.flatMap((id) => {
    const q = getQuestionById(pool, id);
    const order = optionOrder[id];
    if (!q || !order) return [];
    return [{ id, q: q.q, options: order.map((i) => q.options[i]) }];
  });
}

export type GradedQuestion = {
  id: string;
  q: string;
  options: string[]; // shuffled order, as shown
  selectedIndex: number | null; // index into the shuffled `options` above
  correctIndex: number; // index into the shuffled `options` above
  correct: boolean;
  explain: string;
};

/**
 * Grades a submitted attempt against the real bank. `answers` maps
 * questionId -> the index the learner clicked WITHIN THE SHUFFLED `options`
 * array the client was actually shown (that's all the client ever knows —
 * it never learns which original bank index anything maps to). The server
 * independently recomputes the correct answer's position in that same
 * shuffle (`optionOrder[id].indexOf(q.answer)`) and compares — the bank's
 * `answer` field never leaves this module. Returns per-question results
 * safe to show only after grading, plus the raw score.
 */
export function grade(
  pool: BankQuestion[],
  questionIds: string[],
  optionOrder: Record<string, number[]>,
  answers: Record<string, number>
): { score: number; total: number; results: GradedQuestion[] } {
  const results: GradedQuestion[] = [];
  let score = 0;
  for (const id of questionIds) {
    const q = getQuestionById(pool, id);
    const order = optionOrder[id];
    if (!q || !order) continue; // stale/tampered id — silently excluded, not trusted
    const shuffledOptions = order.map((i) => q.options[i]);
    const correctIndexInShuffled = order.indexOf(q.answer);
    const selected = answers[id];
    const selectedIndexInShuffled =
      typeof selected === "number" && selected >= 0 && selected < order.length
        ? selected
        : null;
    const correct = selectedIndexInShuffled === correctIndexInShuffled;
    if (correct) score++;
    results.push({
      id,
      q: q.q,
      options: shuffledOptions,
      selectedIndex: selectedIndexInShuffled,
      correctIndex: correctIndexInShuffled,
      correct,
      explain: q.explain,
    });
  }
  return { score, total: questionIds.length, results };
}
