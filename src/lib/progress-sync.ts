import type { Progress, QuizResult } from "@/lib/progress-types";

/** Per-field merge of two progress objects. Returns the merged result with a
 *  new version (current timestamp). */
export function mergeProgress(local: Progress, server: Progress): Progress {
  const name = server.version >= local.version ? server.name : local.name;

  const completedLessons: Record<string, string[]> = {};
  const allTracks = new Set([
    ...Object.keys(local.completedLessons),
    ...Object.keys(server.completedLessons),
  ]);
  for (const track of allTracks) {
    const localSet = new Set(local.completedLessons[track] ?? []);
    const serverSet = new Set(server.completedLessons[track] ?? []);
    for (const slug of serverSet) localSet.add(slug);
    completedLessons[track] = [...localSet];
  }

  const quizzes: Record<string, QuizResult> = { ...server.quizzes };
  for (const [track, result] of Object.entries(local.quizzes)) {
    const existing = quizzes[track];
    if (!existing || result.score > existing.score) {
      quizzes[track] = result;
    }
  }

  return {
    name,
    completedLessons,
    quizzes,
    version: Date.now(),
  };
}
