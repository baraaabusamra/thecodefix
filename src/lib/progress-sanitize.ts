import type { Progress } from "./progress-types";

// Pure sanitizer for client-submitted progress (saveMyProgress is a public
// Server Action). Content lookups are injected so this is unit-testable and
// free of framework imports.
//
// KNOWN TECHNICAL DEBT (deferred past Phase 0): quiz results and completed
// lessons are still CLAIMS from the browser (localStorage), not server-
// verified facts. This function only guarantees they are *possible* claims:
// real tracks/lessons, each counted once, bounded sizes, and quiz scores that
// are integers within the real quiz's range. Moving points to server-graded
// lesson_quiz_attempts / exam_attempts is a Phase 1+ redesign.

// Far above any real track (largest has ~60 lessons) — only bounds work.
export const MAX_LESSON_ENTRIES_PER_TRACK = 500;
export const MAX_TRACK_ENTRIES = 200;
export const MAX_NAME_LENGTH = 100;

export type ProgressContent = {
  trackSlugs: ReadonlySet<string>;
  lessonsFor: (track: string) => Promise<ReadonlySet<string>> | ReadonlySet<string>;
  quizLength: (track: string) => number | null;
};

function sanitizePassedAt(raw: unknown, now: Date): string {
  if (typeof raw === "string" && raw.length <= 40) {
    const t = Date.parse(raw);
    // Not in the future, not before the site existed.
    if (Number.isFinite(t) && t <= now.getTime() && t >= Date.UTC(2020, 0, 1)) {
      return new Date(t).toISOString();
    }
  }
  return now.toISOString();
}

function ownEntries(obj: unknown): [string, unknown][] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj as Record<string, unknown>).slice(0, MAX_TRACK_ENTRIES);
}

export async function sanitizeProgressInput(
  p: unknown,
  content: ProgressContent,
  now = new Date()
): Promise<Progress> {
  const input = (p && typeof p === "object" ? p : {}) as Partial<Record<keyof Progress, unknown>>;

  const completedLessons: Record<string, string[]> = {};
  for (const [track, lessons] of ownEntries(input.completedLessons)) {
    if (!content.trackSlugs.has(track) || !Array.isArray(lessons)) continue;
    const realLessons = await content.lessonsFor(track);
    // Unique + real: repeating a valid slug can never add points.
    const unique = new Set<string>();
    for (const slug of lessons.slice(0, MAX_LESSON_ENTRIES_PER_TRACK)) {
      if (typeof slug === "string" && realLessons.has(slug)) unique.add(slug);
    }
    if (unique.size) completedLessons[track] = [...unique];
  }

  const quizzes: Progress["quizzes"] = {};
  for (const [track, result] of ownEntries(input.quizzes)) {
    if (!content.trackSlugs.has(track) || !result || typeof result !== "object") continue;
    const length = content.quizLength(track);
    if (!length) continue;
    const r = result as Record<string, unknown>;
    const score = Number(r.score);
    const total = Number(r.total);
    if (!Number.isInteger(score) || !Number.isInteger(total)) continue;
    if (total !== length) continue;
    if (score < 0 || score > total) continue;
    quizzes[track] = { score, total, passedAt: sanitizePassedAt(r.passedAt, now) };
  }

  return {
    name: typeof input.name === "string" ? input.name.slice(0, MAX_NAME_LENGTH) : "",
    completedLessons,
    quizzes,
  };
}
